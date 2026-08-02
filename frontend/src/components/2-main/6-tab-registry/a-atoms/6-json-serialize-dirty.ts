import {
    type RegConfig,
    type RegEditorStore,
    type RegGroup,
    type RegItem,
    type RegNode,
    type RegSeparator,
    REG_HIVES,
    REG_VALUE_TYPES,
    derivedItemLabel,
    isRegItem,
} from "./9-types-registry";

export function buildRegistryFileText(config: RegConfig): string {
    return normalizeFileText(JSON.stringify(config, jsonReplacer, 4));
}

function jsonReplacer(this: RegGroup | RegItem, key: string, value: unknown): unknown {
    if (key === "uid") {
        return undefined;
    }
    if (key === "requireElevated") {
        return value === true ? true : undefined;
    }
    // "curr" is the default view; omit it so files stay uncluttered.
    if (key === "view") {
        return value === "32" || value === "64" ? value : undefined;
    }
    // Item names are optional: persist only when customized.
    if (key === "name" && isRegItem(this as RegNode)) {
        const custom = typeof value === "string" ? value.trim() : "";
        if (!custom || custom === derivedItemLabel(this as RegItem)) {
            return undefined;
        }
        return custom;
    }
    return value;
}

function normalizeFileText(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

export function syncDirty(store: RegEditorStore): void {
    const dirty = computeDirty(store);
    if (store.dirty !== dirty) {
        store.dirty = dirty;
    }
}

function computeDirty(store: RegEditorStore): boolean {
    // Dirty means the live tree differs from the last load/save/import baseline —
    // not merely that no registry.json exists on disk yet.
    return buildRegistryFileText(store.config) !== store.baseline;
}

export function parseRegistryJson(text: string): RegConfig {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as RegConfig).groups)) {
        throw new Error("Invalid registry.json: expected { groups: [...] }");
    }
    const config = parsed as RegConfig;
    config.groups = config.groups.map((group) => normalizeGroup(group));
    return config;
}

export function normalizeGroup(raw: unknown): RegGroup {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid registry.json: group must be an object");
    }
    const group = raw as RegGroup;
    if (typeof group.name !== "string") {
        group.name = "Group";
    }

    const children: RegNode[] = [];
    if (Array.isArray(group.items)) {
        for (const entry of group.items) {
            children.push(normalizeNode(entry));
        }
    }
    group.items = children;
    return group;
}

function normalizeNode(raw: unknown): RegNode {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid registry.json: item must be an object");
    }
    const node = raw as RegNode & { items?: unknown; keyPath?: unknown; separator?: unknown; };
    if (node.separator === true) {
        return normalizeSeparator(node);
    }
    // Nested group: has items[] and is not a registry item.
    if (Array.isArray(node.items) && !("keyPath" in node)) {
        return normalizeGroup(node);
    }
    return normalizeItem(node);
}

function normalizeSeparator(_raw: object): RegSeparator {
    return { separator: true };
}

function normalizeItem(raw: object): RegItem {
    const item = raw as RegItem;
    item.hive = REG_HIVES.includes(item.hive) ? item.hive : "HKCU";
    item.keyPath = typeof item.keyPath === "string" ? item.keyPath : "";
    item.valueName = typeof item.valueName === "string" ? item.valueName : "";
    item.valueType = REG_VALUE_TYPES.includes(item.valueType) ? item.valueType : "REG_SZ";
    item.newValue = typeof item.newValue === "string" ? item.newValue : "";
    if (item.view !== "32" && item.view !== "64") {
        delete item.view;
    }

    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (name && name !== derivedItemLabel(item)) {
        item.name = name;
    } else {
        delete item.name;
    }
    // Items must not carry a nested items array.
    if ("items" in item) {
        delete (item as { items?: unknown; }).items;
    }
    return item;
}
