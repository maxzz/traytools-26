import { proxy, subscribe } from "valtio";
import { appBus, toolsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import {
    type ToolsConfig,
    type ToolsEditorStore,
    type ToolsSelectionPath,
    type ToolsSource,
    ensureUids,
    findByUid,
    findExecIdForUid,
    nodeKind,
    parseToolsSelectionPath,
    sameFilePath,
    selectionPathFromUid,
    sourceFileBaseName,
    uidFromSelectionPath,
} from "./9-types-menu";
import { buildToolsFileText, syncDirty } from "./6-json-serialize-dirty";
import { extractRootComments, parseToolsJsonc } from "./7-json-parse";
import { DEFAULT_TOOLS_CONFIG } from "./8-default-config";
import { syncToolsHotkeys } from "./2-tools-hotkeys";

// ---------------------------------------------------------------------------
// Persistence

export const STORAGE_ID = "traytools-26__tools__v1.1";

type ToolsCache = {
    config: ToolsConfig;
    rootComments: string;
    selectedPath?: ToolsSelectionPath;
};

const cached = readCache();
const initialConfig = cached?.config ?? cloneConfig(DEFAULT_TOOLS_CONFIG);
ensureUids(initialConfig.menu);
const initialRootComments = cached?.rootComments ?? "";
const initialSelectedUid = uidFromSelectionPath(initialConfig.menu, cached?.selectedPath ?? null);

export const toolsEditorStore = proxy<ToolsEditorStore>({
    config: initialConfig,
    source: cached ? "storage" : "default",
    path: "",
    baseline: buildToolsFileText(initialConfig, initialRootComments),
    rootComments: initialRootComments,
    fileExists: false,
    dirty: false,
    status: "",
    error: "",
    selectedUid: initialSelectedUid,
});

// Persist edits to localStorage so a loaded config survives a restart even when
// the file later goes missing. Recompute dirty on every config change so edits
// that are undone back to the loaded state clear the unsaved indicator.
subscribe(toolsEditorStore, () => {
    writeCache(toolsEditorStore.config, toolsEditorStore.rootComments, toolsEditorStore.selectedUid);
    syncDirty(toolsEditorStore);
});

// ---------------------------------------------------------------------------
// Persistence

export function cloneConfig(config: ToolsConfig): ToolsConfig {
    return structuredClone(config);
}

export function readCache(): ToolsCache | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as ToolsConfig | {
                config: ToolsConfig;
                rootComments?: string;
                selectedPath?: unknown;
            };
            // Legacy v1.0 cache: plain ToolsConfig JSON.
            if (parsed && typeof parsed === "object" && "menu" in parsed) {
                return { config: parsed as ToolsConfig, rootComments: "" };
            }
            if (parsed && typeof parsed === "object" && "config" in parsed && parsed.config?.menu) {
                const selectedPath = parseToolsSelectionPath(parsed.selectedPath);
                return {
                    config: parsed.config,
                    rootComments: parsed.rootComments ?? "",
                    ...(selectedPath !== undefined ? { selectedPath } : {}),
                };
            }
        }
        // Fall back to the previous cache key once.
        const legacy = localStorage.getItem("traytools-26__tools__v1.0");
        if (legacy) {
            return { config: JSON.parse(legacy) as ToolsConfig, rootComments: "" };
        }
    } catch (e) {
        console.error("Failed to read cached tools config", e);
    }
    return null;
}

export function writeCache(
    config: ToolsConfig,
    rootComments: string,
    selectedUid: string | null = toolsEditorStore.selectedUid,
) {
    try {
        const selectedPath = selectionPathFromUid(config.menu, selectedUid);
        localStorage.setItem(STORAGE_ID, JSON.stringify({ config, rootComments, selectedPath }));
    } catch (e) {
        console.error("Failed to cache tools config", e);
    }
}

// ---------------------------------------------------------------------------
// Load / save flow
//
// On load: prefer the on-disk managed file (and cache it). If the file is
// missing, fall back to the previously cached (localStorage) version, then to
// the defaults. Open / Save As switch the working path to an arbitrary file.

export async function ToolsConfig_Load(options?: { notify?: boolean; }): Promise<void> {
    const notify = options?.notify === true;
    try {
        const raw = await toolsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseToolsJsonc(raw.content);
                const rootComments = extractRootComments(raw.content);
                ToolsConfig_Set(config, "file", raw.path, true, { rootComments });
                writeCache(config, rootComments, toolsEditorStore.selectedUid);
                toolsEditorStore.status = `Loaded from ${raw.path}`;
                if (notify) {
                    notice.success(`Loaded from<br/>${raw.path}`);
                }
                return;
            } catch (e) {
                toolsEditorStore.error = `Invalid tools.json: ${String(e)}`;
                if (notify) {
                    notice.error(toolsEditorStore.error);
                }
                // fall through to cached/default below
            }
        }

        // No file on disk (or it was unparseable) — use the cached copy.
        const cached = readCache();
        if (cached) {
            ToolsConfig_Set(cached.config, "storage", raw?.path ?? "", false, { rootComments: cached.rootComments });
            if (!toolsEditorStore.error) {
                toolsEditorStore.status = "File not found — using saved copy";
                if (notify) {
                    notice.warning("File not found — using saved copy");
                }
            }
            return;
        }

        ToolsConfig_Set(cloneConfig(DEFAULT_TOOLS_CONFIG), "default", raw?.path ?? "", false);
        if (!toolsEditorStore.error) {
            toolsEditorStore.status = "No tools.json — showing defaults";
            if (notify) {
                notice.info("No tools.json — showing defaults");
            }
        }
    } catch (e) {
        toolsEditorStore.error = `Failed to load tools menu: ${String(e)}`;
        if (notify) {
            notice.error(toolsEditorStore.error);
        }
    }
}

/** Reload the current working file, or the managed tools.json when none is open. */
export async function ToolsConfig_Reload(): Promise<void> {
    const { path, fileExists } = toolsEditorStore;
    if (fileExists && path) {
        try {
            const { content } = await toolsBus.readTextFile(path);
            const config = parseToolsJsonc(content);
            const rootComments = extractRootComments(content);
            const source: ToolsSource = toolsEditorStore.source === "open" ? "open" : "file";
            ToolsConfig_Set(config, source, path, true, { rootComments });
            writeCache(config, rootComments, toolsEditorStore.selectedUid);
            toolsEditorStore.status = `Reloaded from ${path}`;
            notice.success(`Reloaded from<br/>${path}`);
        } catch (e) {
            const msg = `Failed to reload: ${String(e)}`;
            toolsEditorStore.error = msg;
            notice.error(msg);
        }
        return;
    }
    await ToolsConfig_Load({ notify: true });
}

// Record a freshly loaded (or saved) config as the baseline for dirty tracking.
function ToolsConfig_Set(
    config: ToolsConfig,
    source: ToolsSource,
    path = "",
    fileExists = source === "file" || source === "open",
    opts?: { rootComments?: string; },
) {
    // Capture selection as an index path before ensureUids reassigns runtime uids.
    const pathToRestore = selectionPathFromUid(toolsEditorStore.config.menu, toolsEditorStore.selectedUid);

    ensureUids(config.menu);
    toolsEditorStore.rootComments = opts?.rootComments ?? "";
    toolsEditorStore.config = config;
    toolsEditorStore.source = source;
    toolsEditorStore.path = path;
    toolsEditorStore.fileExists = fileExists;
    toolsEditorStore.baseline = buildToolsFileText(config, toolsEditorStore.rootComments);
    toolsEditorStore.dirty = false;
    toolsEditorStore.error = "";
    toolsEditorStore.selectedUid = uidFromSelectionPath(config.menu, pathToRestore);
}

function markSaved(path: string, text: string, source: ToolsSource = "file") {
    toolsEditorStore.path = path;
    toolsEditorStore.source = source;
    toolsEditorStore.baseline = text;
    toolsEditorStore.fileExists = true;
    toolsEditorStore.dirty = false;
    toolsEditorStore.error = "";
    toolsEditorStore.status = `Saved to ${path}`;
    writeCache(toolsEditorStore.config, toolsEditorStore.rootComments, toolsEditorStore.selectedUid);
}

/** Whether the working path is the managed tools.json used by the live Tools menu. */
async function isManagedWorkingPath(workingPath: string): Promise<boolean> {
    if (!workingPath) {
        return false;
    }
    try {
        const raw = await toolsBus.getRaw();
        return Boolean(raw?.path && sameFilePath(workingPath, raw.path));
    } catch {
        return false;
    }
}

/**
 * Persist the working document. Overwrites the current path when one exists;
 * otherwise writes the managed tools.json (creating it if needed).
 */
export async function ToolsConfig_Save(): Promise<void> {
    try {
        const text = buildToolsFileText(toolsEditorStore.config, toolsEditorStore.rootComments);
        const workingPath = toolsEditorStore.path;

        if (workingPath && toolsEditorStore.fileExists) {
            await toolsBus.writeTextFile(workingPath, text);
            markSaved(workingPath, text, toolsEditorStore.source === "open" ? "open" : "file");
            return;
        }

        // First persist (Create new / local storage) — write managed tools.json.
        const res = await toolsBus.save(text);
        const path = res?.path ?? workingPath;
        markSaved(path, text, "file");
    } catch (e) {
        toolsEditorStore.error = `Failed to save: ${String(e)}`;
        notice.error(toolsEditorStore.error);
    }
}

/** Persist the working file and (re)register hotkeys when it is the live Tools menu file. */
export async function ToolsConfig_Apply(): Promise<void> {
    await ToolsConfig_Save();
    if (toolsEditorStore.error) {
        return;
    }

    if (await isManagedWorkingPath(toolsEditorStore.path)) {
        await syncToolsHotkeys();
        if (!toolsEditorStore.error) {
            toolsEditorStore.status = `Applied — saved to ${toolsEditorStore.path}`;
        }
    }
}

/** Open an arbitrary JSON file into the editor (native dialog). */
export async function ToolsConfig_Open(): Promise<void> {
    try {
        const pick = await toolsBus.openPath();
        if (pick.canceled || !pick.path) {
            return;
        }
        const { content } = await toolsBus.readTextFile(pick.path);
        const config = parseToolsJsonc(content);
        const rootComments = extractRootComments(content);
        ToolsConfig_Set(config, "open", pick.path, true, { rootComments });
        writeCache(config, rootComments, toolsEditorStore.selectedUid);
        toolsEditorStore.status = `Opened ${pick.path}`;
        notice.success(`Opened<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to open: ${String(e)}`;
        toolsEditorStore.error = msg;
        notice.error(msg);
    }
}

/** Save under a new name and switch the working file to that path. */
export async function ToolsConfig_SaveAs(): Promise<void> {
    try {
        const defaultName = sourceFileBaseName(toolsEditorStore.path) || "tools.json";
        const pick = await toolsBus.saveAsPath(defaultName);
        if (pick.canceled || !pick.path) {
            return;
        }
        const text = buildToolsFileText(toolsEditorStore.config, toolsEditorStore.rootComments);
        await toolsBus.writeTextFile(pick.path, text);
        markSaved(pick.path, text, "open");
        notice.success(`Saved as<br/>${pick.path}`);

        if (await isManagedWorkingPath(pick.path)) {
            await syncToolsHotkeys();
            if (!toolsEditorStore.error) {
                toolsEditorStore.status = `Applied — saved to ${pick.path}`;
            }
        }
    } catch (e) {
        const msg = `Failed to save as: ${String(e)}`;
        toolsEditorStore.error = msg;
        notice.error(msg);
    }
}

/** Start a new config from the default template; kept in local storage until Save. */
export function ToolsConfig_CreateNew() {
    const config = cloneConfig(DEFAULT_TOOLS_CONFIG);
    ToolsConfig_Set(config, "default", "", false);
    toolsEditorStore.status = "New configuration — local storage until saved";
    writeCache(config, toolsEditorStore.rootComments, toolsEditorStore.selectedUid);
    notice.info("Created new configuration — local storage only until saved");
}

/** @deprecated Use ToolsConfig_CreateNew */
export function ToolsConfig_ResetToDefaults() {
    ToolsConfig_CreateNew();
}

/** Open File Explorer with the working file selected, or warn if nothing is on disk yet. */
export async function ToolsConfig_RevealInExplorer(): Promise<void> {
    if (!toolsEditorStore.fileExists || !toolsEditorStore.path) {
        notice.warning("No file on disk yet. Use Save to create it first.");
        return;
    }
    try {
        await appBus.revealInExplorer(toolsEditorStore.path);
    } catch (e) {
        notice.error(`Failed to reveal file:<br/>${String(e)}`);
    }
}

/**
 * Run a command/registry item by editor uid the same way as the top-level Tools
 * menu (`getMenu` + `exec`). Applies first when the editor is dirty or the
 * file does not exist yet, so the launched command matches the panel fields.
 *
 * Run always uses the managed tools.json. When the working file is a different
 * path, the current editor content is written there first so the command matches.
 */
export async function ToolsConfig_ExecuteByUid(uid: string): Promise<void> {
    const node = findByUid(toolsEditorStore.config.menu, uid)?.node;
    if (!node || nodeKind(node) !== "item") {
        return;
    }

    const name = node.menuName || "Command";
    if (!node.cmdLine?.trim()) {
        notice.warning(`"${name}" has no command / path / URL.`);
        return;
    }

    if (toolsEditorStore.dirty || !toolsEditorStore.fileExists) {
        await ToolsConfig_Apply();
        if (toolsEditorStore.error) {
            return;
        }
    }

    try {
        const text = buildToolsFileText(toolsEditorStore.config, toolsEditorStore.rootComments);
        const managed = await toolsBus.getRaw();
        if (!managed?.path || !sameFilePath(toolsEditorStore.path, managed.path)) {
            // Run uses the live Tools menu file; push editor content there for this test.
            await toolsBus.save(text);
            await syncToolsHotkeys();
        }

        const menu = await toolsBus.getMenu();
        if (!menu.found) {
            notice.error("No tools.json found.");
            return;
        }
        if (menu.error) {
            notice.error(`Invalid tools.json:\n ${menu.error}`);
            return;
        }

        const id = findExecIdForUid(toolsEditorStore.config.menu, uid);
        if (id == null) {
            notice.error(`Command "${name}" is not available in the Tools menu.`);
            return;
        }

        await toolsBus.exec(id);
    } catch (e) {
        notice.error(`Command "${name}":\n ${String(e)}`);
    }
}

/** Run the currently selected command/registry item. */
export async function ToolsConfig_ExecuteSelected(): Promise<void> {
    const uid = toolsEditorStore.selectedUid;
    if (!uid) {
        return;
    }
    await ToolsConfig_ExecuteByUid(uid);
}
