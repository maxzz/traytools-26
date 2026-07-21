import { type CopyConfig, type CopyEditorStore, type CopyGroup, type CopyOpItem } from "./9-types-copy";

export function buildCopyFileText(config: CopyConfig): string {
    return normalizeFileText(JSON.stringify(config, jsonReplacer, 4));
}

function jsonReplacer(this: CopyGroup | CopyOpItem, key: string, value: unknown): unknown {
    if (key === "uid") {
        return undefined;
    }
    if (key === "stopDpAgent" || key === "requireElevated") {
        return value === true ? true : undefined;
    }
    if (key === "sourceFile" || key === "destFolder" || key === "name") {
        return typeof value === "string" ? value : value;
    }
    return value;
}

function normalizeFileText(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

export function syncDirty(store: CopyEditorStore): void {
    const dirty = computeDirty(store);
    if (store.dirty !== dirty) {
        store.dirty = dirty;
    }
}

function computeDirty(store: CopyEditorStore): boolean {
    // After Import, baseline is the imported text — Changed tracks edits vs that.
    if (store.source === "import") {
        return buildCopyFileText(store.config) !== store.baseline;
    }
    if (!store.fileExists) {
        return true;
    }
    return buildCopyFileText(store.config) !== store.baseline;
}

export function parseCopyJson(text: string): CopyConfig {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as CopyConfig).groups)) {
        throw new Error("Invalid copy.json: expected { groups: [...] }");
    }
    const config = parsed as CopyConfig;
    for (const group of config.groups) {
        if (!group || typeof group !== "object") {
            throw new Error("Invalid copy.json: group must be an object");
        }
        if (typeof group.name !== "string") {
            group.name = "Group";
        }
        if (!Array.isArray(group.items)) {
            group.items = [];
        }
        for (const item of group.items) {
            if (!item || typeof item !== "object") {
                throw new Error("Invalid copy.json: item must be an object");
            }
            item.sourceFile = typeof item.sourceFile === "string" ? item.sourceFile : "";
            item.destFolder = typeof item.destFolder === "string" ? item.destFolder : "";
        }
    }
    return config;
}
