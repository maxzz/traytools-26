import { proxy, subscribe } from "valtio";
import { appBus, copyOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import { type CopyConfig, type CopyEditorStore, type CopySelectionPath, type CopySource, ensureUids, parseCopySelectionPath, selectionPathFromUid, uidFromSelectionPath } from "./9-types-copy";
import { buildCopyFileText, parseCopyJson, syncDirty } from "./6-json-serialize-dirty";
import { DEFAULT_COPY_CONFIG } from "./8-default-config";

// Store

export const STORAGE_ID = "traytools-26__copy__v1.0";

type CopyCache = {
    config: CopyConfig;
    rootUid: string;
    selectedPath: CopySelectionPath | null;
};

const cached = readCache();
const initialConfig = cached?.config ?? cloneConfig(DEFAULT_COPY_CONFIG);
const rootHolder = { rootUid: cached?.rootUid ?? "" };
ensureUids(initialConfig, rootHolder);
const initialSelectedUid = uidFromSelectionPath(
    initialConfig,
    rootHolder.rootUid,
    cached?.selectedPath ?? { kind: "root" },
);

export const copyEditorStore = proxy<CopyEditorStore>({
    config: initialConfig,
    rootUid: rootHolder.rootUid,
    source: cached ? "storage" : "default",
    path: "",
    baseline: buildCopyFileText(initialConfig),
    fileExists: false,
    dirty: true,
    status: "",
    error: "",
    selectedUid: initialSelectedUid,
});

subscribe(copyEditorStore, () => {
    writeCache(copyEditorStore.config, copyEditorStore.rootUid, copyEditorStore.selectedUid);
    syncDirty(copyEditorStore);
});

// Cache functions

export function cloneConfig(config: CopyConfig): CopyConfig {
    return structuredClone(config);
}

export function readCache(): CopyCache | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (!stored) {
            return null;
        }
        const parsed = JSON.parse(stored) as {
            config?: CopyConfig;
            rootUid?: string;
            selectedPath?: unknown;
        };
        if (parsed?.config && Array.isArray(parsed.config.groups)) {
            return {
                config: parsed.config,
                rootUid: parsed.rootUid ?? "",
                selectedPath: parseCopySelectionPath(parsed.selectedPath),
            };
        }
    } catch (e) {
        console.error("Failed to read cached copy config", e);
    }
    return null;
}

export function writeCache(config: CopyConfig, rootUid: string, selectedUid: string | null = copyEditorStore.selectedUid) {
    try {
        const selectedPath = selectionPathFromUid(config, rootUid, selectedUid);
        localStorage.setItem(STORAGE_ID, JSON.stringify({ config, rootUid, selectedPath }));
    } catch (e) {
        console.error("Failed to cache copy config", e);
    }
}

// Config functions

export async function CopyConfig_Load(options?: { notify?: boolean; }): Promise<void> {
    const notify = options?.notify === true;
    try {
        const raw = await copyOpsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseCopyJson(raw.content);
                CopyConfig_Set(config, "file", raw.path, true);
                writeCache(config, copyEditorStore.rootUid, copyEditorStore.selectedUid);
                if (notify) {
                    notice.success(`Loaded from<br/>${raw.path}`);
                }
                return;
            } catch (e) {
                const msg = `Invalid copy.json: ${String(e)}`;
                copyEditorStore.error = msg;
                notice.error(msg);
            }
        }

        const cached = readCache();
        if (cached) {
            CopyConfig_Set(cached.config, "storage", raw?.path ?? "", false);
            if (!copyEditorStore.error) {
                copyEditorStore.status = "";
                if (notify) {
                    notice.warning("File not found — using saved copy");
                }
            }
            return;
        }

        CopyConfig_Set(cloneConfig(DEFAULT_COPY_CONFIG), "default", raw?.path ?? "", false);
        if (!copyEditorStore.error) {
            copyEditorStore.status = "";
            if (notify) {
                notice.info("No copy.json — showing defaults");
            }
        }
    } catch (e) {
        const msg = `Failed to load copy operations: ${String(e)}`;
        copyEditorStore.error = msg;
        notice.error(msg);
    }
}

function CopyConfig_Set(config: CopyConfig, source: CopySource, path = "", fileExists = source === "file") {
    // Capture selection as an index path before ensureUids reassigns runtime uids.
    const pathToRestore = selectionPathFromUid(
        copyEditorStore.config,
        copyEditorStore.rootUid,
        copyEditorStore.selectedUid,
    );

    const holder = { rootUid: copyEditorStore.rootUid };
    ensureUids(config, holder);
    copyEditorStore.rootUid = holder.rootUid;
    copyEditorStore.config = config;
    copyEditorStore.source = source;
    copyEditorStore.path = path;
    copyEditorStore.fileExists = fileExists;
    copyEditorStore.baseline = buildCopyFileText(config);
    copyEditorStore.dirty = !fileExists;
    copyEditorStore.error = "";
    copyEditorStore.selectedUid = uidFromSelectionPath(config, holder.rootUid, pathToRestore);
}

export async function CopyConfig_Save(): Promise<void> {
    try {
        const text = buildCopyFileText(copyEditorStore.config);
        const res = await copyOpsBus.save(text);
        copyEditorStore.path = res?.path ?? copyEditorStore.path;
        copyEditorStore.source = "file";
        copyEditorStore.baseline = text;
        copyEditorStore.fileExists = true;
        copyEditorStore.dirty = false;
        copyEditorStore.error = "";
        copyEditorStore.status = "";
        writeCache(copyEditorStore.config, copyEditorStore.rootUid, copyEditorStore.selectedUid);
        notice.success(`Saved to<br/>${copyEditorStore.path}`);
    } catch (e) {
        const msg = `Failed to save copy.json: ${String(e)}`;
        copyEditorStore.error = msg;
        notice.error(msg);
    }
}

export async function CopyConfig_Apply(): Promise<void> {
    await CopyConfig_Save();
}

/** Start a new config from the default template; kept in local storage until Save. */
export function CopyConfig_CreateNew() {
    const config = cloneConfig(DEFAULT_COPY_CONFIG);
    CopyConfig_Set(config, "default", "", false);
    copyEditorStore.selectedUid = copyEditorStore.rootUid;
    copyEditorStore.status = "";
    writeCache(config, copyEditorStore.rootUid, copyEditorStore.selectedUid);
    notice.info("Created new configuration — local storage only until saved");
}

/** Open File Explorer with copy.json selected, or warn if it was never saved. */
export async function CopyConfig_RevealInExplorer(): Promise<void> {
    if (!copyEditorStore.fileExists || !copyEditorStore.path) {
        notice.warning("copy.json has not been saved yet. Use Save to create it first.");
        return;
    }
    try {
        await appBus.revealInExplorer(copyEditorStore.path);
    } catch (e) {
        notice.error(`Failed to reveal copy.json:<br/>${String(e)}`);
    }
}

/** Import an arbitrary JSON file (native dialog). Sets baseline to imported text so Changed clears. */
export async function CopyConfig_Import(): Promise<void> {
    try {
        const pick = await copyOpsBus.importPath();
        if (pick.canceled || !pick.path) {
            return;
        }
        const { content } = await copyOpsBus.readTextFile(pick.path);
        const config = parseCopyJson(content);
        CopyConfig_Set(config, "import", pick.path, false);
        copyEditorStore.baseline = buildCopyFileText(config);
        copyEditorStore.dirty = false;
        copyEditorStore.status = "";
        writeCache(config, copyEditorStore.rootUid, copyEditorStore.selectedUid);
        notice.success(`Imported from<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to import: ${String(e)}`;
        copyEditorStore.error = msg;
        notice.error(msg);
    }
}

/** Export current editor JSON via SaveFileDialog (default copy.json). */
export async function CopyConfig_Export(): Promise<void> {
    try {
        const pick = await copyOpsBus.exportPath("copy.json");
        if (pick.canceled || !pick.path) {
            return;
        }
        const text = buildCopyFileText(copyEditorStore.config);
        await copyOpsBus.writeTextFile(pick.path, text);
        copyEditorStore.status = "";
        copyEditorStore.error = "";
        notice.success(`Exported to<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to export: ${String(e)}`;
        copyEditorStore.error = msg;
        notice.error(msg);
    }
}
