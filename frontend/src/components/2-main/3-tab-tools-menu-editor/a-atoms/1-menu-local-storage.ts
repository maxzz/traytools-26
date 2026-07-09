import { proxy } from "valtio";
import { ensureUids, type ToolsConfig } from "./9-types-menu";
import { buildToolsFileText } from "./7-json-support";
import { DEFAULT_TOOLS_CONFIG } from "./8-default-config";

// ---------------------------------------------------------------------------
// Persistence

export const STORAGE_ID = "traytools-26__tools__v1.1";

export type ToolsSource = "default" | "file" | "storage";

export interface ToolsEditorStore {
    config: ToolsConfig;         // the current editable tree
    source: ToolsSource;         // where `config` came from on the last load
    path: string;                // file path reported by the backend (load/save target)
    baseline: string;            // full file text at last load/save (includes JSONC comments)
    rootComments: string;        // // and /* */ lines inside the root { } before "menu"
    fileExists: boolean;         // whether tools.json currently exists on disk
    dirty: boolean;              // true when the editor differs from the loaded/saved file
    status: string;              // last user-facing status message
    error: string;               // last error, if any
    selectedUid: string | null;  // uid of the node shown in the properties panel
}

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
