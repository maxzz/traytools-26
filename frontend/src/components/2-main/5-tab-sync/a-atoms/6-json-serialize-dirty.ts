import {
    type SyncConfig,
    type SyncEditorStore,
    type SyncGroup,
    type SyncNode,
    type SyncOpItem,
    type SyncSeparator,
    folderBaseName,
    isSyncOpItem,
} from "./9-types-sync";

export function buildSyncFileText(config: SyncConfig): string {
    return normalizeFileText(JSON.stringify(config, jsonReplacer, 4));
}

function jsonReplacer(this: SyncGroup | SyncOpItem, key: string, value: unknown): unknown {
    if (key === "uid") {
        return undefined;
    }
    // Item operation names are optional: persist only when customized.
    if (key === "name" && isSyncOpItem(this as SyncNode)) {
        const custom = typeof value === "string" ? value.trim() : "";
        if (!custom || custom === folderBaseName((this as SyncOpItem).sourceFolder)) {
            return undefined;
        }
        return custom;
    }
    // Direction-specific tooltip names: omit when empty.
    if ((key === "forwardName" || key === "reverseName") && isSyncOpItem(this as SyncNode)) {
        const custom = typeof value === "string" ? value.trim() : "";
        return custom || undefined;
    }
    if (
        key === "sourceFolder"
        || key === "destFolder"
        || key === "name"
        || key === "forwardName"
        || key === "reverseName"
    ) {
        return typeof value === "string" ? value : value;
    }
    return value;
}

function normalizeFileText(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

export function syncDirty(store: SyncEditorStore): void {
    const dirty = computeDirty(store);
    if (store.dirty !== dirty) {
        store.dirty = dirty;
    }
}

function computeDirty(store: SyncEditorStore): boolean {
    // Dirty means the live tree differs from the last load/save/import baseline —
    // not merely that no sync.json exists on disk yet.
    return buildSyncFileText(store.config) !== store.baseline;
}

export function parseSyncJson(text: string): SyncConfig {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as SyncConfig).groups)) {
        throw new Error("Invalid sync.json: expected { groups: [...] }");
    }
    const config = parsed as SyncConfig;
    config.groups = config.groups.map((group) => normalizeGroup(group));
    return config;
}

function normalizeGroup(raw: unknown): SyncGroup {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid sync.json: group must be an object");
    }
    const group = raw as SyncGroup & { groups?: unknown[]; };
    if (typeof group.name !== "string") {
        group.name = "Group";
    }

    const children: SyncNode[] = [];
    if (Array.isArray(group.items)) {
        for (const entry of group.items) {
            children.push(normalizeNode(entry));
        }
    }
    // Legacy / mistaken separate nested `groups` array → fold into `items`.
    if (Array.isArray(group.groups)) {
        for (const entry of group.groups) {
            children.push(normalizeGroup(entry));
        }
        delete group.groups;
    }
    group.items = children;
    return group;
}

function normalizeNode(raw: unknown): SyncNode {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid sync.json: item must be an object");
    }
    const node = raw as SyncNode & { items?: unknown; sourceFolder?: unknown; separator?: unknown; };
    if (node.separator === true) {
        return normalizeSeparator(node);
    }
    // Nested group: has items[] and is not a sync item.
    if (Array.isArray(node.items) && !("sourceFolder" in node)) {
        return normalizeGroup(node);
    }
    return normalizeItem(node);
}

function normalizeSeparator(_raw: object): SyncSeparator {
    return { separator: true };
}

function normalizeItem(raw: object): SyncOpItem {
    const item = raw as SyncOpItem;
    item.sourceFolder = typeof item.sourceFolder === "string" ? item.sourceFolder : "";
    item.destFolder = typeof item.destFolder === "string" ? item.destFolder : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (name && name !== folderBaseName(item.sourceFolder)) {
        item.name = name;
    } else {
        delete item.name;
    }
    normalizeOptionalName(item, "forwardName");
    normalizeOptionalName(item, "reverseName");
    // Items must not carry a nested items array.
    if ("items" in item) {
        delete (item as { items?: unknown; }).items;
    }
    return item;
}

function normalizeOptionalName(item: SyncOpItem, key: "forwardName" | "reverseName"): void {
    const value = typeof item[key] === "string" ? item[key]!.trim() : "";
    if (value) {
        item[key] = value;
    } else {
        delete item[key];
    }
}
