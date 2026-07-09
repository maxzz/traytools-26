import { defaultRunElevated, type ToolMenuItem, type ToolsConfig, type ToolsEditorStore } from "./9-types-menu";

/**
 * Serialize the config object to JSON (4-space indent). Does not include the
 * root-object JSONC header comments — use buildToolsFileText for the full file.
 */
export function serializeToolsConfig(config: ToolsConfig): string {
    return JSON.stringify(config, jsonReplacer, 4);
}

/**
 * JSON replacer function for the config object.
 * @param this - The ToolMenuItem object.
 * @param key - The key of the property being serialized.
 * @param value - The value of the property being serialized.
 * @returns The value to be serialized.
*/
function jsonReplacer(this: ToolMenuItem, key: string, value: unknown): unknown {
    if (key === "uid") {
        return undefined;
    }
    if (key === "runElevated") {
        return value === defaultRunElevated(this) ? undefined : value;
    }
    if (key === "comment") {
        return typeof value === "string" && value.trim() === "" ? undefined : value;
    }
    return value;
}

/**
 * Build the full tools.json text, optionally preserving root-object JSONC
 * comments loaded from the on-disk file.
 */
export function buildToolsFileText(config: ToolsConfig, rootComments = ""): string {
    const body = serializeToolsConfig(config);
    if (!rootComments.trim()) {
        return normalizeFileText(body);
    }

    const newline = body.indexOf("\n");
    if (newline < 0) {
        return normalizeFileText(body);
    }

    const rest = body.slice(newline + 1);
    const header = rootComments.endsWith("\n") ? rootComments : `${rootComments}\n`;
    return normalizeFileText(`{\n${header}${rest}`);
}

function normalizeFileText(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

// ---------------------------------------------------------------------------
// Dirty tracking

/**
 * Sync the dirty state of the editor store.
 * @param store - The ToolsEditorStore object.
 */
export function syncDirty(store: ToolsEditorStore): void {
    const dirty = computeDirty(store);
    if (store.dirty !== dirty) {
        store.dirty = dirty;
    }
}

/**
 * Compare the live editor tree against the last loaded/saved baseline. When no
 * tools.json exists on disk yet, the editor is always considered modified.
 */
function computeDirty(store: ToolsEditorStore): boolean {
    if (!store.fileExists) {
        return true;
    }
    return buildToolsFileText(store.config, store.rootComments) !== store.baseline;
}
