import { useEffect } from "react";
import { proxy, subscribe } from "valtio";
import { appBus, registryOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import {
    type RegConfig,
    type RegEditorStore,
    type RegItem,
    type RegSelectionPath,
    type RegSource,
    collectGroupItems,
    ensureUids,
    parseRegSelectionPath,
    selectionPathFromUid,
    uidFromSelectionPath,
} from "./9-types-registry";
import { buildRegistryFileText, parseRegistryJson, syncDirty } from "./6-json-serialize-dirty";
import { buildRegFileText } from "./7-reg-file-format";
import { DEFAULT_REGISTRY_CONFIG } from "./8-default-config";

// Store

export const STORAGE_ID = "traytools-26__registry__v1.0";

type RegCache = {
    config: RegConfig;
    rootUid: string;
    selectedPath: RegSelectionPath | null;
};

const cached = readCache();
const initialConfig = cached?.config ?? cloneConfig(DEFAULT_REGISTRY_CONFIG);
const rootHolder = { rootUid: cached?.rootUid ?? "" };
ensureUids(initialConfig, rootHolder);
const initialSelectedUid = uidFromSelectionPath(
    initialConfig,
    rootHolder.rootUid,
    cached?.selectedPath ?? { kind: "root" },
);

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
});

subscribe(registryEditorStore, () => {
    writeCache(registryEditorStore.config, registryEditorStore.rootUid, registryEditorStore.selectedUid);
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
                config: parsed.config,
                rootUid: parsed.rootUid ?? "",
                selectedPath: parseRegSelectionPath(parsed.selectedPath),
            };
        }
    } catch (e) {
        console.error("Failed to read cached registry config", e);
    }
    return null;
}

export function writeCache(config: RegConfig, rootUid: string, selectedUid: string | null = registryEditorStore.selectedUid) {
    try {
        const selectedPath = selectionPathFromUid(config, rootUid, selectedUid);
        localStorage.setItem(STORAGE_ID, JSON.stringify({ config, rootUid, selectedPath }));
    } catch (e) {
        console.error("Failed to cache registry config", e);
    }
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
}

export async function RegistryConfig_Save(): Promise<void> {
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

/** Export the current editor tree as JSON via SaveFileDialog. */
export async function RegistryConfig_Export(): Promise<void> {
    try {
        const pick = await registryOpsBus.exportPath("registry.json", "json");
        if (pick.canceled || !pick.path) {
            return;
        }
        const text = buildRegistryFileText(registryEditorStore.config);
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
 * Export the desired values as a Windows .reg file. The backend re-encodes to
 * UTF-16LE with CRLF so regedit accepts the result.
 */
export async function RegistryConfig_ExportReg(): Promise<void> {
    try {
        const items = collectAllItems();
        if (!items.length) {
            notice.warning("Nothing to export — the tree has no registry values");
            return;
        }
        const pick = await registryOpsBus.exportPath("registry.reg", "reg");
        if (pick.canceled || !pick.path) {
            return;
        }
        await registryOpsBus.writeTextFile(pick.path, buildRegFileText(items));
        registryEditorStore.status = "";
        registryEditorStore.error = "";
        notice.success(`Exported to<br/>${pick.path}`);
    } catch (e) {
        const msg = `Failed to export .reg: ${String(e)}`;
        registryEditorStore.error = msg;
        notice.error(msg);
    }
}

function collectAllItems(): RegItem[] {
    return registryEditorStore.config.groups.flatMap((group) => collectGroupItems(group));
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
