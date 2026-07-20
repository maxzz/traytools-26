import { proxy, subscribe } from "valtio";
import { copyOpsBus } from "@/bridge";
import {
    type CopyConfig,
    type CopyEditorStore,
    type CopySource,
    ensureUids,
    findByUid,
} from "./9-types-copy";
import { buildCopyFileText, parseCopyJson, syncDirty } from "./6-json-serialize-dirty";
import { DEFAULT_COPY_CONFIG } from "./8-default-config";

export const STORAGE_ID = "traytools-26__copy__v1.0";

const cached = readCache();
const initialConfig = cached?.config ?? cloneConfig(DEFAULT_COPY_CONFIG);
const rootHolder = { rootUid: cached?.rootUid ?? "" };
ensureUids(initialConfig, rootHolder);

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
    selectedUid: rootHolder.rootUid,
});

subscribe(copyEditorStore, () => {
    writeCache(copyEditorStore.config, copyEditorStore.rootUid);
    syncDirty(copyEditorStore);
});

export function cloneConfig(config: CopyConfig): CopyConfig {
    return structuredClone(config);
}

export function readCache(): { config: CopyConfig; rootUid: string; } | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (!stored) {
            return null;
        }
        const parsed = JSON.parse(stored) as { config?: CopyConfig; rootUid?: string; };
        if (parsed?.config && Array.isArray(parsed.config.groups)) {
            return { config: parsed.config, rootUid: parsed.rootUid ?? "" };
        }
    } catch (e) {
        console.error("Failed to read cached copy config", e);
    }
    return null;
}

export function writeCache(config: CopyConfig, rootUid: string) {
    try {
        localStorage.setItem(STORAGE_ID, JSON.stringify({ config, rootUid }));
    } catch (e) {
        console.error("Failed to cache copy config", e);
    }
}

export async function CopyConfig_Load(): Promise<void> {
    try {
        const raw = await copyOpsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseCopyJson(raw.content);
                CopyConfig_Set(config, "file", raw.path, true);
                writeCache(config, copyEditorStore.rootUid);
                copyEditorStore.status = `Loaded from ${raw.path}`;
                return;
            } catch (e) {
                copyEditorStore.error = `Invalid copy.json: ${String(e)}`;
            }
        }

        const cached = readCache();
        if (cached) {
            CopyConfig_Set(cached.config, "storage", raw?.path ?? "", false);
            if (!copyEditorStore.error) {
                copyEditorStore.status = "File not found — using saved copy";
            }
            return;
        }

        CopyConfig_Set(cloneConfig(DEFAULT_COPY_CONFIG), "default", raw?.path ?? "", false);
        if (!copyEditorStore.error) {
            copyEditorStore.status = "No copy.json — showing defaults";
        }
    } catch (e) {
        copyEditorStore.error = `Failed to load copy operations: ${String(e)}`;
    }
}

function CopyConfig_Set(config: CopyConfig, source: CopySource, path = "", fileExists = source === "file") {
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

    if (copyEditorStore.selectedUid) {
        if (
            copyEditorStore.selectedUid !== copyEditorStore.rootUid
            && !findByUid(config, copyEditorStore.selectedUid)
        ) {
            copyEditorStore.selectedUid = copyEditorStore.rootUid;
        }
    }
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
        copyEditorStore.status = `Saved to ${copyEditorStore.path}`;
        writeCache(copyEditorStore.config, copyEditorStore.rootUid);
    } catch (e) {
        copyEditorStore.error = `Failed to save copy.json: ${String(e)}`;
    }
}

export async function CopyConfig_Apply(): Promise<void> {
    await CopyConfig_Save();
    if (!copyEditorStore.error) {
        copyEditorStore.status = `Applied — saved to ${copyEditorStore.path}`;
    }
}

export function CopyConfig_ResetToDefaults() {
    const config = cloneConfig(DEFAULT_COPY_CONFIG);
    const holder = { rootUid: copyEditorStore.rootUid };
    ensureUids(config, holder);
    copyEditorStore.rootUid = holder.rootUid;
    copyEditorStore.config = config;
    copyEditorStore.source = "default";
    syncDirty(copyEditorStore);
    copyEditorStore.status = "Reset to default copy operations";
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
        copyEditorStore.status = `Imported from ${pick.path}`;
        writeCache(config, copyEditorStore.rootUid);
    } catch (e) {
        copyEditorStore.error = `Failed to import: ${String(e)}`;
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
        copyEditorStore.status = `Exported to ${pick.path}`;
        copyEditorStore.error = "";
    } catch (e) {
        copyEditorStore.error = `Failed to export: ${String(e)}`;
    }
}
