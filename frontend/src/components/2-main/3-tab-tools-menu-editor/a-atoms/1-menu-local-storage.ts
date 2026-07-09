import { proxy } from "valtio";
import { toolsBus } from "@/bridge";
import { type ToolsConfig, type ToolsEditorStore, ensureUids } from "./9-types-menu";
import { setToolsConfig } from "./0-menu-editor-atoms";
import { buildToolsFileText, extractRootComments, parseToolsJsonc } from "./7-json-support";
import { DEFAULT_TOOLS_CONFIG } from "./8-default-config";

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
        localStorage.setItem(STORAGE_ID, JSON.stringify({
            config,
            rootComments,
        }));
    } catch (e) {
        console.error("Failed to cache tools config", e);
    }
}

// ---------------------------------------------------------------------------
// Load / save flow
//
// On load: prefer the on-disk file (and cache it). If the file is missing, fall
// back to the previously cached (localStorage) version, then to the defaults.

export async function loadToolsConfig(): Promise<void> {
    try {
        const raw = await toolsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseToolsJsonc(raw.content);
                const rootComments = extractRootComments(raw.content);
                setToolsConfig(config, "file", raw.path, true, { rootComments });
                writeCache(config, rootComments);
                toolsEditorStore.status = `Loaded from ${raw.path}`;
                return;
            } catch (e) {
                toolsEditorStore.error = `Invalid tools.json: ${String(e)}`;
                // fall through to cached/default below
            }
        }

        // No file on disk (or it was unparseable) — use the cached copy.
        const cached = readCache();
        if (cached) {
            setToolsConfig(cached.config, "storage", raw?.path ?? "", false, { rootComments: cached.rootComments });
            if (!toolsEditorStore.error) {
                toolsEditorStore.status = "File not found — using saved copy";
            }
            return;
        }

        setToolsConfig(cloneConfig(DEFAULT_TOOLS_CONFIG), "default", raw?.path ?? "", false);
        if (!toolsEditorStore.error) {
            toolsEditorStore.status = "No tools.json — showing defaults";
        }
    } catch (e) {
        toolsEditorStore.error = `Failed to load tools menu: ${String(e)}`;
    }
}

export async function saveToolsConfig(): Promise<void> {
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
