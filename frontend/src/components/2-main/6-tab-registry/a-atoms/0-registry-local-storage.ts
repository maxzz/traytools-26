import { useEffect } from "react";
import { proxy, subscribe } from "valtio";
import { appBus, registryOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import {
    type RegConfig,
    type RegEditorStore,
    type RegGroup,
    type RegSelectionPath,
    type RegSource,
    collapsedPathsFromUids,
    collapsedUidsFromPaths,
    collectGroupItems,
    ensureUids,
    findByUid,
    findInvalidKeyPathItems,
    parseCollapsedPaths,
    parseRegSelectionPath,
    selectionPathFromUid,
    uidFromSelectionPath,
} from "./9-types-registry";
import { buildRegistryFileText, normalizeRegConfig, parseRegistryJson, syncDirty } from "./6-json-serialize-dirty";
import { buildRegFileText } from "./7-reg-file-format";
import { DEFAULT_REGISTRY_CONFIG } from "./8-default-config";

// Store

export const STORAGE_ID = "traytools-26__registry__v1.0";
/** Per-filename collapsed folder ids (index paths). Separate from the config cache. */
export const COLLAPSE_STORAGE_ID = "traytools-26__registry-collapsed__v1.0";

type RegCache = {
    config: RegConfig;
    rootUid: string;
    selectedPath: RegSelectionPath | null;
};

/** Map of filename → collapsed node ids for that file. */
type CollapseByFile = Record<string, string[]>;

/** Placeholder key while the editor has no path (new / unsaved). */
const UNSAVED_COLLAPSE_KEY = "__unsaved__";

const cached = readCache();
const initialConfig = cached?.config ?? cloneConfig(DEFAULT_REGISTRY_CONFIG);
const rootHolder = { rootUid: cached?.rootUid ?? "" };
ensureUids(initialConfig, rootHolder);
const initialSelectedUid = uidFromSelectionPath(
    initialConfig,
    rootHolder.rootUid,
    cached?.selectedPath ?? { kind: "root" },
);
// Move any pre-per-file collapsedPaths into the map (default working file name).
migrateLegacyCollapsedPaths();
// Path is unknown until RegistryConfig_Load; start from the unsaved slot.
const initialCollapsedUids = loadCollapsedUidsForFile("", initialConfig, rootHolder.rootUid);

export const registryEditorStore = proxy<RegEditorStore>({
    config: initialConfig,
    rootUid: rootHolder.rootUid,
    source: cached ? "storage" : "default",
    path: "",
    baseline: buildRegistryFileText(initialConfig),
    fileExists: false,
    dirty: false,
    status: "",
    error: "",
    selectedUid: initialSelectedUid,
    collapsedUids: initialCollapsedUids,
    strictKeyPathValidation: false,
});

subscribe(registryEditorStore, () => {
    writeCache(registryEditorStore.config, registryEditorStore.rootUid, registryEditorStore.selectedUid);
    saveCollapsedUidsForFile(
        registryEditorStore.path,
        registryEditorStore.config,
        registryEditorStore.rootUid,
        registryEditorStore.collapsedUids,
    );
    syncDirty(registryEditorStore);
});

/**
 * Hydrate from disk once for the app lifetime. Mounted from AllDialogs so the
 * Registry page can remount on tab switches without reloading and wiping edits.
 * Explicit Reload in the toolbar still calls RegistryConfig_Load({ notify: true }).
 */
export function RegistryConfigSync() {
    useEffect(
        () => {
            void RegistryConfig_Load();
        },
        [],
    );
    return null;
}

// Cache functions

export function cloneConfig(config: RegConfig): RegConfig {
    return structuredClone(config);
}

export function readCache(): RegCache | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (!stored) {
            return null;
        }
        const parsed = JSON.parse(stored) as {
            config?: RegConfig;
            rootUid?: string;
            selectedPath?: unknown;
        };
        if (parsed?.config && Array.isArray(parsed.config.groups)) {
            return {
                // The cached copy may predate the current shape (e.g. one value
                // per key), so it goes through the same migration as the file.
                config: normalizeRegConfig(parsed.config),
                rootUid: parsed.rootUid ?? "",
                selectedPath: parseRegSelectionPath(parsed.selectedPath),
            };
        }
    } catch (e) {
        console.error("Failed to read cached registry config", e);
    }
    return null;
}

export function writeCache(
    config: RegConfig,
    rootUid: string,
    selectedUid: string | null = registryEditorStore.selectedUid,
) {
    try {
        const selectedPath = selectionPathFromUid(config, rootUid, selectedUid);
        localStorage.setItem(STORAGE_ID, JSON.stringify({ config, rootUid, selectedPath }));
    } catch (e) {
        console.error("Failed to cache registry config", e);
    }
}

/** Toggle expand/collapse for the Groups root or a group; persists via subscribe. */
export function toggleRegistryCollapsed(uid: string): void {
    if (!uid) {
        return;
    }
    const uids = registryEditorStore.collapsedUids;
    const index = uids.indexOf(uid);
    if (index >= 0) {
        uids.splice(index, 1);
    } else {
        uids.push(uid);
    }
}

// ---------------------------------------------------------------------------
// Per-filename collapsed tree state
//
// Keys are filenames (basename of the working path). Values are stable index-
// path ids ("root", "0", "0.2"). On load/import, ids that no longer resolve
// are dropped and the pruned list is written back for that file.

function collapseFileKey(path: string): string {
    const name = fileBaseName(path);
    return name || UNSAVED_COLLAPSE_KEY;
}

function readCollapseByFile(): CollapseByFile {
    try {
        const stored = localStorage.getItem(COLLAPSE_STORAGE_ID);
        if (!stored) {
            return {};
        }
        const parsed = JSON.parse(stored) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }
        const out: CollapseByFile = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof key === "string" && key) {
                out[key] = parseCollapsedPaths(value);
            }
        }
        return out;
    } catch (e) {
        console.error("Failed to read registry collapse state", e);
        return {};
    }
}

function writeCollapseByFile(map: CollapseByFile): void {
    try {
        localStorage.setItem(COLLAPSE_STORAGE_ID, JSON.stringify(map));
    } catch (e) {
        console.error("Failed to cache registry collapse state", e);
    }
}

/**
 * One-time move of collapsedPaths that used to live in the config cache into
 * the per-file map under the default working filename.
 */
function migrateLegacyCollapsedPaths(): void {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (!stored) {
            return;
        }
        const parsed = JSON.parse(stored) as { collapsedPaths?: unknown; };
        if (parsed.collapsedPaths === undefined) {
            return;
        }
        const paths = parseCollapsedPaths(parsed.collapsedPaths);
        delete parsed.collapsedPaths;
        localStorage.setItem(STORAGE_ID, JSON.stringify(parsed));

        if (!paths.length) {
            return;
        }
        const map = readCollapseByFile();
        // Prefer the usual on-disk name; only fill if that slot is still empty.
        if (!map["registry.json"]?.length) {
            map["registry.json"] = paths;
            writeCollapseByFile(map);
        }
    } catch {
        // ignore corrupt legacy cache
    }
}

/**
 * Restore collapsed uids for `path`, pruning ids that no longer exist in
 * `config`. Writes the pruned id list back under that filename.
 */
function loadCollapsedUidsForFile(path: string, config: RegConfig, rootUid: string): string[] {
    const key = collapseFileKey(path);
    const map = readCollapseByFile();
    const stored = map[key] ?? [];
    const uids = collapsedUidsFromPaths(config, rootUid, stored);
    const pruned = collapsedPathsFromUids(config, rootUid, uids);
    if (pruned.length) {
        map[key] = pruned;
    } else {
        delete map[key];
    }
    writeCollapseByFile(map);
    return uids;
}

/** Persist current collapsed uids under the filename for `path` (pruned). */
function saveCollapsedUidsForFile(
    path: string,
    config: RegConfig,
    rootUid: string,
    collapsedUids: string[],
): void {
    const key = collapseFileKey(path);
    const map = readCollapseByFile();
    const pruned = collapsedPathsFromUids(config, rootUid, collapsedUids);
    if (pruned.length) {
        map[key] = pruned;
    } else {
        delete map[key];
    }
    writeCollapseByFile(map);
}

// Config functions

export async function RegistryConfig_Load(options?: { notify?: boolean; }): Promise<void> {
    const notify = options?.notify === true;
    try {
        const raw = await registryOpsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseRegistryJson(raw.content);
                RegistryConfig_Set(config, "file", raw.path, true);
                writeCache(config, registryEditorStore.rootUid, registryEditorStore.selectedUid);
                if (notify) {
                    notice.success(`Loaded from<br/>${raw.path}`);
                }
                return;
            } catch (e) {
                const msg = `Invalid registry.json: ${String(e)}`;
                registryEditorStore.error = msg;
                notice.error(msg);
            }
        }

        const cached = readCache();
        if (cached) {
            RegistryConfig_Set(cached.config, "storage", raw?.path ?? "", false);
            if (!registryEditorStore.error) {
                registryEditorStore.status = "";
                if (notify) {
                    notice.warning("File not found — using saved copy");
                }
            }
            return;
        }

        RegistryConfig_Set(cloneConfig(DEFAULT_REGISTRY_CONFIG), "default", raw?.path ?? "", false);
        if (!registryEditorStore.error) {
            registryEditorStore.status = "";
            if (notify) {
                notice.info("No registry.json — showing defaults");
            }
        }
    } catch (e) {
        const msg = `Failed to load registry operations: ${String(e)}`;
        registryEditorStore.error = msg;
        notice.error(msg);
    }
}

function RegistryConfig_Set(config: RegConfig, source: RegSource, path = "", fileExists = source === "file") {
    // Persist collapse for the file we're leaving (keyed by its filename).
    saveCollapsedUidsForFile(
        registryEditorStore.path,
        registryEditorStore.config,
        registryEditorStore.rootUid,
        registryEditorStore.collapsedUids,
    );

    // Capture selection as an index path before ensureUids reassigns runtime uids.
    const pathToRestore = selectionPathFromUid(
        registryEditorStore.config,
        registryEditorStore.rootUid,
        registryEditorStore.selectedUid,
    );

    const holder = { rootUid: registryEditorStore.rootUid };
    ensureUids(config, holder);
    registryEditorStore.rootUid = holder.rootUid;
    registryEditorStore.config = config;
    registryEditorStore.source = source;
    registryEditorStore.path = path;
    registryEditorStore.fileExists = fileExists;
    registryEditorStore.baseline = buildRegistryFileText(config);
    registryEditorStore.dirty = false;
    registryEditorStore.error = "";
    registryEditorStore.selectedUid = uidFromSelectionPath(config, holder.rootUid, pathToRestore);
    // Restore (and prune obsolete ids for) the file we're opening.
    registryEditorStore.collapsedUids = loadCollapsedUidsForFile(path, config, holder.rootUid);
}

export async function RegistryConfig_Save(): Promise<void> {
    const invalid = findInvalidKeyPathItems(registryEditorStore.config);
    if (invalid.length) {
        registryEditorStore.strictKeyPathValidation = true;
        const first = invalid[0].item;
        if (first.uid) {
            registryEditorStore.selectedUid = first.uid;
        }
        const msg = invalid.length === 1
            ? "Cannot save registry.json — a key path is invalid. Correct it and try again."
            : `Cannot save registry.json — ${invalid.length} key paths are invalid. Correct them and try again.`;
        registryEditorStore.error = msg;
        notice.error(msg);
        return;
    }

    try {
        const text = buildRegistryFileText(registryEditorStore.config);
        const res = await registryOpsBus.save(text);
        registryEditorStore.path = res?.path ?? registryEditorStore.path;
        registryEditorStore.source = "file";
        registryEditorStore.baseline = text;
        registryEditorStore.fileExists = true;
        registryEditorStore.dirty = false;
        registryEditorStore.error = "";
        registryEditorStore.status = "";
        registryEditorStore.strictKeyPathValidation = false;
        writeCache(registryEditorStore.config, registryEditorStore.rootUid, registryEditorStore.selectedUid);
        notice.success(`Saved to<br/>${registryEditorStore.path}`);
    } catch (e) {
        const msg = `Failed to save registry.json: ${String(e)}`;
        registryEditorStore.error = msg;
        notice.error(msg);
    }
}

export async function RegistryConfig_Apply(): Promise<void> {
    await RegistryConfig_Save();
}

/** Start a new config from the default template; kept in local storage until Save. */
export function RegistryConfig_CreateNew() {
    const config = cloneConfig(DEFAULT_REGISTRY_CONFIG);
    RegistryConfig_Set(config, "default", "", false);
    registryEditorStore.selectedUid = registryEditorStore.rootUid;
    registryEditorStore.status = "";
    writeCache(config, registryEditorStore.rootUid, registryEditorStore.selectedUid);
    notice.info("Created new configuration — local storage only until saved");
}

/** Open File Explorer with the working file selected, or warn if nothing is on disk yet. */
export async function RegistryConfig_RevealInExplorer(): Promise<void> {
    const { path, fileExists, source } = registryEditorStore;
    const canReveal = Boolean(path) && (fileExists || source === "import");
    if (!canReveal) {
        notice.warning("No file on disk yet. Use Save to create registry.json first.");
        return;
    }
    try {
        await appBus.revealInExplorer(path);
    } catch (e) {
        notice.error(`Failed to reveal file:<br/>${String(e)}`);
    }
}

/**
 * Import a JSON config file (native dialog), replacing the whole tree. Sets the
 * baseline to the imported text so Changed clears.
 */
export async function RegistryConfig_Import(): Promise<void> {
    try {
        const pick = await registryOpsBus.importPath("json");
        if (pick.canceled || !pick.path) {
            return;
        }
        const { content } = await registryOpsBus.readTextFile(pick.path);
        const config = parseRegistryJson(content);
        RegistryConfig_Set(config, "import", pick.path, false);
        registryEditorStore.baseline = buildRegistryFileText(config);
        registryEditorStore.dirty = false;
        registryEditorStore.status = "";
        writeCache(config, registryEditorStore.rootUid, registryEditorStore.selectedUid);
        notice.success(`Imported from<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to import: ${String(e)}`;
        registryEditorStore.error = msg;
        notice.error(msg);
    }
}

/** Export JSON via SaveFileDialog — selected group, or the whole tree at root. */
export async function RegistryConfig_Export(): Promise<void> {
    try {
        const scope = exportScope();
        const pick = await registryOpsBus.exportPath(`${scope.baseName}.json`, "json");
        if (pick.canceled || !pick.path) {
            return;
        }
        const text = buildRegistryFileText(scope.config);
        await registryOpsBus.writeTextFile(pick.path, text);
        registryEditorStore.status = "";
        registryEditorStore.error = "";
        notice.success(`Exported to<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to export: ${String(e)}`;
        registryEditorStore.error = msg;
        notice.error(msg);
    }
}

/**
 * Export a Windows .reg file of the selected group's values (or the whole tree
 * at root). The backend re-encodes to UTF-16LE with CRLF so regedit accepts it.
 */
export async function RegistryConfig_ExportReg(): Promise<void> {
    try {
        const scope = exportScope();
        const hasValues = scope.config.groups.some((group) => collectGroupItems(group).length > 0);
        if (!hasValues) {
            notice.warning(
                scope.group
                    ? `Nothing to export — "${scope.group.name}" has no registry values`
                    : "Nothing to export — the tree has no registry values",
            );
            return;
        }
        const pick = await registryOpsBus.exportPath(`${scope.baseName}.reg`, "reg");
        if (pick.canceled || !pick.path) {
            return;
        }
        await registryOpsBus.writeTextFile(pick.path, buildRegFileText(scope.config.groups));
        registryEditorStore.status = "";
        registryEditorStore.error = "";
        notice.success(`Exported to<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to export .reg: ${String(e)}`;
        registryEditorStore.error = msg;
        notice.error(msg);
    }
}

type ExportScope = {
    /** Filename stem: group name, or "registry" for the whole tree. */
    baseName: string;
    /** Config to serialize — one group, or the full editor tree. */
    config: RegConfig;
    group: RegGroup | null;
};

/**
 * When a group (or a key/separator inside one) is selected, export that group
 * alone. Root selection exports the entire tree as `registry.*`.
 */
function exportScope(): ExportScope {
    const group = selectedExportGroup();
    if (!group) {
        return { baseName: "registry", config: registryEditorStore.config, group: null };
    }
    const baseName = sanitizeFilenameBase(group.name) || "registry";
    return {
        baseName,
        config: { groups: [group] },
        group,
    };
}

/** Selected group, or the parent group of a selected key/separator. */
function selectedExportGroup(): RegGroup | null {
    const uid = registryEditorStore.selectedUid;
    if (!uid || uid === registryEditorStore.rootUid) {
        return null;
    }
    return findByUid(registryEditorStore.config, uid)?.group ?? null;
}

/** Strip characters Windows rejects in a file name. */
function sanitizeFilenameBase(name: string): string {
    return name
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .replace(/[. ]+$/g, "");
}

export function fileBaseName(path: string): string {
    const parts = path.replace(/\//g, "\\").split("\\");
    return parts[parts.length - 1] || path;
}

/** Strip the extension so a dropped "tracing.reg" becomes the group name "tracing". */
export function fileBaseNameNoExt(path: string): string {
    const base = fileBaseName(path);
    const dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(0, dot) : base;
}

export function reportRegImport(count: number, warnings: string[], path: string): void {
    if (warnings.length) {
        notice.warning(
            `Imported ${count} value(s) from ${fileBaseName(path)}, skipped ${warnings.length}:<br/>${warnings.slice(0, 5).join("<br/>")}`,
        );
        return;
    }
    notice.success(`Imported ${count} value(s) from<br/>${path}`);
}
