import type { ToolsConfig } from "./9-types-menu";

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
