import { proxy, subscribe } from "valtio";
import { appBus, toolsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import { type ToolsConfig, type ToolsEditorStore, type ToolsSource, ensureUids, findByUid } from "./9-types-menu";
import { buildToolsFileText, syncDirty } from "./6-json-serialize-dirty";
import { extractRootComments, parseToolsJsonc } from "./7-json-parse";
import { DEFAULT_TOOLS_CONFIG } from "./8-default-config";
import { syncToolsHotkeys } from "./2-tools-hotkeys";

// ---------------------------------------------------------------------------
// Persistence

export const STORAGE_ID = "traytools-26__tools__v1.1";

const cached = readCache();
const initialConfig = cached?.config ?? cloneConfig(DEFAULT_TOOLS_CONFIG);
ensureUids(initialConfig.menu);
const initialRootComments = cached?.rootComments ?? "";

export const toolsEditorStore = proxy<ToolsEditorStore>({
    config: initialConfig,
    source: cached ? "storage" : "default",
    path: "",
    baseline: buildToolsFileText(initialConfig, initialRootComments),
    rootComments: initialRootComments,
    fileExists: false,
    dirty: true, // no on-disk file yet — unsaved until first save
    status: "",
    error: "",
    selectedUid: null,
});

// Persist edits to localStorage so a loaded config survives a restart even when
// the file later goes missing. Recompute dirty on every config change so edits
// that are undone back to the loaded state clear the unsaved indicator.
subscribe(toolsEditorStore, () => {
    writeCache(toolsEditorStore.config, toolsEditorStore.rootComments);
    syncDirty(toolsEditorStore);
});

// ---------------------------------------------------------------------------
// Persistence

export function cloneConfig(config: ToolsConfig): ToolsConfig {
    return structuredClone(config);
}

export function readCache(): { config: ToolsConfig; rootComments: string; } | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as ToolsConfig | { config: ToolsConfig; rootComments?: string; };
            // Legacy v1.0 cache: plain ToolsConfig JSON.
            if (parsed && typeof parsed === "object" && "menu" in parsed) {
                return { config: parsed as ToolsConfig, rootComments: "" };
            }
            if (parsed && typeof parsed === "object" && "config" in parsed && parsed.config?.menu) {
                return { config: parsed.config, rootComments: parsed.rootComments ?? "" };
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

export function writeCache(config: ToolsConfig, rootComments: string) {
    try {
        localStorage.setItem(STORAGE_ID, JSON.stringify({ config, rootComments }));
    } catch (e) {
        console.error("Failed to cache tools config", e);
    }
}

// ---------------------------------------------------------------------------
// Load / save flow
//
// On load: prefer the on-disk file (and cache it). If the file is missing, fall
// back to the previously cached (localStorage) version, then to the defaults.

export async function ToolsConfig_Load(): Promise<void> {
    try {
        const raw = await toolsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseToolsJsonc(raw.content);
                const rootComments = extractRootComments(raw.content);
                ToolsConfig_Set(config, "file", raw.path, true, { rootComments });
                writeCache(config, rootComments);
                toolsEditorStore.status = `Loaded from ${raw.path}`;
                //notice.success(`Loaded from ${raw.path}`);
                return;
            } catch (e) {
                toolsEditorStore.error = `Invalid tools.json: ${String(e)}`;
                // fall through to cached/default below
            }
        }

        // No file on disk (or it was unparseable) — use the cached copy.
        const cached = readCache();
        if (cached) {
            ToolsConfig_Set(cached.config, "storage", raw?.path ?? "", false, { rootComments: cached.rootComments });
            if (!toolsEditorStore.error) {
                toolsEditorStore.status = "File not found — using saved copy";
            }
            return;
        }

        ToolsConfig_Set(cloneConfig(DEFAULT_TOOLS_CONFIG), "default", raw?.path ?? "", false);
        if (!toolsEditorStore.error) {
            toolsEditorStore.status = "No tools.json — showing defaults";
        }
    } catch (e) {
        toolsEditorStore.error = `Failed to load tools menu: ${String(e)}`;
    }
}

// Record a freshly loaded (or saved) config as the baseline for dirty tracking.
function ToolsConfig_Set(
    config: ToolsConfig,
    source: ToolsSource,
    path = "",
    fileExists = source === "file",
    opts?: { rootComments?: string; },
) {
    ensureUids(config.menu);
    toolsEditorStore.rootComments = opts?.rootComments ?? "";
    toolsEditorStore.config = config;
    toolsEditorStore.source = source;
    toolsEditorStore.path = path;
    toolsEditorStore.fileExists = fileExists;
    toolsEditorStore.baseline = buildToolsFileText(config, toolsEditorStore.rootComments);
    toolsEditorStore.dirty = !fileExists;
    toolsEditorStore.error = "";

    // Keep the current selection if it still exists, otherwise clear it.
    if (toolsEditorStore.selectedUid && !findByUid(config.menu, toolsEditorStore.selectedUid)) {
        toolsEditorStore.selectedUid = null;
    }
}

export async function ToolsConfig_Save(): Promise<void> {
    try {
        const text = buildToolsFileText(toolsEditorStore.config, toolsEditorStore.rootComments);
        const res = await toolsBus.save(text);
        toolsEditorStore.path = res?.path ?? toolsEditorStore.path;
        toolsEditorStore.source = "file";
        toolsEditorStore.baseline = text;
        toolsEditorStore.fileExists = true;
        toolsEditorStore.dirty = false;
        toolsEditorStore.error = "";
        toolsEditorStore.status = `Saved to ${toolsEditorStore.path}`;
        writeCache(toolsEditorStore.config, toolsEditorStore.rootComments);
    } catch (e) {
        toolsEditorStore.error = `Failed to save tools.json: ${String(e)}`;
    }
}

/** Persist tools.json and (re)register global/local tool hotkeys. */
export async function ToolsConfig_Apply(): Promise<void> {
    await ToolsConfig_Save();
    if (toolsEditorStore.error) {
        return;
    }
    await syncToolsHotkeys();
    if (!toolsEditorStore.error) {
        toolsEditorStore.status = `Applied — saved to ${toolsEditorStore.path}`;
    }
}

export function ToolsConfig_ResetToDefaults() {
    const config = cloneConfig(DEFAULT_TOOLS_CONFIG);
    ensureUids(config.menu);
    toolsEditorStore.config = config;
    toolsEditorStore.rootComments = "";
    toolsEditorStore.source = "default";
    syncDirty(toolsEditorStore);
    toolsEditorStore.status = "Reset to default tools";
}

/** Open File Explorer with tools.json selected, or warn if it was never saved. */
export async function ToolsConfig_RevealInExplorer(): Promise<void> {
    if (!toolsEditorStore.fileExists || !toolsEditorStore.path) {
        notice.warning("tools.json has not been saved yet. Use Apply to create it first.");
        return;
    }
    try {
        await appBus.revealInExplorer(toolsEditorStore.path);
    } catch (e) {
        notice.error(`Failed to reveal tools.json:<br/>${String(e)}`);
    }
}
