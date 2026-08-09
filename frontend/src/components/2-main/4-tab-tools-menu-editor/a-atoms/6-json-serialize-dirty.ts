import { defaultRunElevated, type ToolMenuItem, type ToolsConfig, type ToolsEditorStore } from "./9-types-menu";

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

/**
 * Serialize the config object to JSON (4-space indent). Does not include the
 * root-object JSONC header comments — use buildToolsFileText for the full file.
 */
function serializeToolsConfig(config: ToolsConfig): string {
    return JSON.stringify(config, jsonReplacer, 4);
}

/** Same formatting rules as the file, for one menu item subtree. */
export function buildNodeFileText(node: ToolMenuItem): string {
    return normalizeFileText(JSON.stringify(node, jsonReplacer, 4));
}

/** Snapshot each node's file text under its runtime uid (for per-row dirty dots). */
export function collectNodeTextsByUid(config: ToolsConfig): Record<string, string> {
    const out: Record<string, string> = {};
    walkNodes([config.menu], (node) => {
        if (node.uid) {
            out[node.uid] = buildNodeFileText(node);
        }
    });
    return out;
}

export function captureBaselineNodes(store: ToolsEditorStore): void {
    store.baselineNodeTextByUid = collectNodeTextsByUid(store.config);
    store.dirtyUids = [];
}

function walkNodes(nodes: readonly ToolMenuItem[], visit: (node: ToolMenuItem) => void): void {
    for (const node of nodes) {
        visit(node);
        if (node.menuItems?.length) {
            walkNodes(node.menuItems, visit);
        }
    }
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
    if (key === "hotKeyGlobal") {
        // Default is application-local; only persist an explicit global flag.
        return value === true ? true : undefined;
    }
    if (key === "hotKey") {
        return typeof value === "string" && value.trim() === "" ? undefined : value;
    }
    if (key === "comment") {
        return typeof value === "string" && value.trim() === "" ? undefined : value;
    }
    return value;
}

/**
 * Normalize the file text to remove any trailing newlines.
 * @param text - The text to normalize.
 * @returns The normalized text.
 */
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
    const dirtyUids = computeDirtyUids(store);
    if (!sameUidList(store.dirtyUids, dirtyUids)) {
        store.dirtyUids = dirtyUids;
    }
}

/**
 * Compare the live editor tree against the last loaded/saved baseline.
 * Missing tools.json alone does not count as dirty — only edits vs baseline do.
 */
function computeDirty(store: ToolsEditorStore): boolean {
    return buildToolsFileText(store.config, store.rootComments) !== store.baseline;
}

function computeDirtyUids(store: ToolsEditorStore): string[] {
    const dirtyUids: string[] = [];
    walkNodes([store.config.menu], (node) => {
        const uid = node.uid;
        if (!uid) {
            return;
        }
        const baselineText = store.baselineNodeTextByUid[uid];
        if (baselineText === undefined || baselineText !== buildNodeFileText(node)) {
            dirtyUids.push(uid);
        }
    });
    return dirtyUids;
}

function sameUidList(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
