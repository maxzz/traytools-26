import { useEffect } from "react";
import { proxy, subscribe } from "valtio";
import { appBus, syncOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import { type SyncConfig, type SyncEditorStore, type SyncSelectionPath, type SyncSource, ensureUids, parseSyncSelectionPath, selectionPathFromUid, uidFromSelectionPath } from "./9-types-sync";
import { buildSyncFileText, captureBaselineNodes, collectNodeTextsByUid, ensureSkipPatternsOnConfig, parseSyncJson, syncDirty } from "./6-json-serialize-dirty";
import { DEFAULT_SYNC_CONFIG } from "./8-default-config";

// Store

export const STORAGE_ID = "traytools-26__sync__v1.0";

type SyncCache = {
    config: SyncConfig;
    rootUid: string;
    selectedPath: SyncSelectionPath | null;
};

const cached = readCache();
const initialConfig = cached?.config ?? cloneConfig(DEFAULT_SYNC_CONFIG);
ensureSkipPatternsOnConfig(initialConfig);
const rootHolder = { rootUid: cached?.rootUid ?? "" };
ensureUids(initialConfig, rootHolder);
const initialSelectedUid = uidFromSelectionPath(
    initialConfig,
    rootHolder.rootUid,
    cached?.selectedPath ?? { kind: "root" },
);

export const syncEditorStore = proxy<SyncEditorStore>({
    config: initialConfig,
    rootUid: rootHolder.rootUid,
    source: cached ? "storage" : "default",
    path: "",
    baseline: buildSyncFileText(initialConfig),
    baselineNodeTextByUid: collectNodeTextsByUid(initialConfig),
    fileExists: false,
    dirty: false,
    dirtyUids: [],
    status: "",
    error: "",
    selectedUid: initialSelectedUid,
});

subscribe(syncEditorStore, () => {
    writeCache(syncEditorStore.config, syncEditorStore.rootUid, syncEditorStore.selectedUid);
    syncDirty(syncEditorStore);
});

/**
 * Hydrate from disk once for the app lifetime. Mounted from AllDialogs so the
 * Sync page can remount on tab switches without reloading and wiping edits.
 * Explicit Reload in the toolbar still calls SyncConfig_Load({ notify: true }).
 */
export function SyncConfigSync() {
    useEffect(
        () => {
            void SyncConfig_Load();
        },
        [],
    );
    return null;
}

// Cache functions

export function cloneConfig(config: SyncConfig): SyncConfig {
    return structuredClone(config);
}

export function readCache(): SyncCache | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (!stored) {
            return null;
        }
        const parsed = JSON.parse(stored) as {
            config?: SyncConfig;
            rootUid?: string;
            selectedPath?: unknown;
        };
        if (parsed?.config && Array.isArray(parsed.config.groups)) {
            return {
                config: parsed.config,
                rootUid: parsed.rootUid ?? "",
                selectedPath: parseSyncSelectionPath(parsed.selectedPath),
            };
        }
    } catch (e) {
        console.error("Failed to read cached sync config", e);
    }
    return null;
}

export function writeCache(config: SyncConfig, rootUid: string, selectedUid: string | null = syncEditorStore.selectedUid) {
    try {
        const selectedPath = selectionPathFromUid(config, rootUid, selectedUid);
        localStorage.setItem(STORAGE_ID, JSON.stringify({ config, rootUid, selectedPath }));
    } catch (e) {
        console.error("Failed to cache sync config", e);
    }
}

// Config functions

export async function SyncConfig_Load(options?: { notify?: boolean; }): Promise<void> {
    const notify = options?.notify === true;
    try {
        const raw = await syncOpsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseSyncJson(raw.content);
                SyncConfig_Set(config, "file", raw.path, true);
                writeCache(config, syncEditorStore.rootUid, syncEditorStore.selectedUid);
                if (notify) {
                    notice.success(`Loaded from<br/>${raw.path}`);
                }
                return;
            } catch (e) {
                const msg = `Invalid sync.json: ${String(e)}`;
                syncEditorStore.error = msg;
                notice.error(msg);
            }
        }

        const cached = readCache();
        if (cached) {
            SyncConfig_Set(cached.config, "storage", raw?.path ?? "", false);
            if (!syncEditorStore.error) {
                syncEditorStore.status = "";
                if (notify) {
                    notice.warning("File not found — using saved sync");
                }
            }
            return;
        }

        SyncConfig_Set(cloneConfig(DEFAULT_SYNC_CONFIG), "default", raw?.path ?? "", false);
        if (!syncEditorStore.error) {
            syncEditorStore.status = "";
            if (notify) {
                notice.info("No sync.json — showing defaults");
            }
        }
    } catch (e) {
        const msg = `Failed to load sync operations: ${String(e)}`;
        syncEditorStore.error = msg;
        notice.error(msg);
    }
}

function SyncConfig_Set(config: SyncConfig, source: SyncSource, path = "", fileExists = source === "file") {
    // Capture selection as an index path before ensureUids reassigns runtime uids.
    const pathToRestore = selectionPathFromUid(
        syncEditorStore.config,
        syncEditorStore.rootUid,
        syncEditorStore.selectedUid,
    );

    const holder = { rootUid: syncEditorStore.rootUid };
    ensureUids(config, holder);
    syncEditorStore.rootUid = holder.rootUid;
    syncEditorStore.config = config;
    syncEditorStore.source = source;
    syncEditorStore.path = path;
    syncEditorStore.fileExists = fileExists;
    syncEditorStore.baseline = buildSyncFileText(config);
    captureBaselineNodes(syncEditorStore);
    syncEditorStore.dirty = false;
    syncEditorStore.error = "";
    syncEditorStore.selectedUid = uidFromSelectionPath(config, holder.rootUid, pathToRestore);
}

export async function SyncConfig_Save(): Promise<void> {
    try {
        const text = buildSyncFileText(syncEditorStore.config);
        const res = await syncOpsBus.save(text);
        syncEditorStore.path = res?.path ?? syncEditorStore.path;
        syncEditorStore.source = "file";
        syncEditorStore.baseline = text;
        captureBaselineNodes(syncEditorStore);
        syncEditorStore.fileExists = true;
        syncEditorStore.dirty = false;
        syncEditorStore.error = "";
        syncEditorStore.status = "";
        writeCache(syncEditorStore.config, syncEditorStore.rootUid, syncEditorStore.selectedUid);
        notice.success(`Saved to<br/>${syncEditorStore.path}`);
    } catch (e) {
        const msg = `Failed to save sync.json: ${String(e)}`;
        syncEditorStore.error = msg;
        notice.error(msg);
    }
}

export async function SyncConfig_Apply(): Promise<void> {
    await SyncConfig_Save();
}

/** Start a new config from the default template; kept in local storage until Save. */
export function SyncConfig_CreateNew() {
    const config = cloneConfig(DEFAULT_SYNC_CONFIG);
    SyncConfig_Set(config, "default", "", false);
    syncEditorStore.selectedUid = syncEditorStore.rootUid;
    syncEditorStore.status = "";
    writeCache(config, syncEditorStore.rootUid, syncEditorStore.selectedUid);
    notice.info("Created new configuration — local storage only until saved");
}

/** Open File Explorer with the working file selected, or warn if nothing is on disk yet. */
export async function SyncConfig_RevealInExplorer(): Promise<void> {
    const { path, fileExists, source } = syncEditorStore;
    const canReveal = Boolean(path) && (fileExists || source === "import");
    if (!canReveal) {
        notice.warning("No file on disk yet. Use Save to create sync.json first.");
        return;
    }
    try {
        await appBus.revealInExplorer(path);
    } catch (e) {
        notice.error(`Failed to reveal file:<br/>${String(e)}`);
    }
}

/** Import an arbitrary JSON file (native dialog). Sets baseline to imported text so Changed clears. */
export async function SyncConfig_Import(): Promise<void> {
    try {
        const pick = await syncOpsBus.importPath();
        if (pick.canceled || !pick.path) {
            return;
        }
        const { content } = await syncOpsBus.readTextFile(pick.path);
        const config = parseSyncJson(content);
        SyncConfig_Set(config, "import", pick.path, false);
        syncEditorStore.status = "";
        writeCache(config, syncEditorStore.rootUid, syncEditorStore.selectedUid);
        notice.success(`Imported from<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to import: ${String(e)}`;
        syncEditorStore.error = msg;
        notice.error(msg);
    }
}

/** Export current editor JSON via SaveFileDialog (default sync.json). */
export async function SyncConfig_Export(): Promise<void> {
    try {
        const pick = await syncOpsBus.exportPath("sync.json");
        if (pick.canceled || !pick.path) {
            return;
        }
        const text = buildSyncFileText(syncEditorStore.config);
        await syncOpsBus.writeTextFile(pick.path, text);
        syncEditorStore.status = "";
        syncEditorStore.error = "";
        notice.success(`Exported to<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to export: ${String(e)}`;
        syncEditorStore.error = msg;
        notice.error(msg);
    }
}
