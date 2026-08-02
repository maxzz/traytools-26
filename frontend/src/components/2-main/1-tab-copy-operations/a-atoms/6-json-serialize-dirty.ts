import { normalizeOptionalComment } from "@/components/2-main/a-shared/field-comment";
import {
    type CopyConfig,
    type CopyEditorStore,
    type CopyGroup,
    type CopyNode,
    type CopyOpItem,
    type CopySeparator,
    isCopyOpItem,
    sourceFileBaseName,
} from "./9-types-copy";

export function buildCopyFileText(config: CopyConfig): string {
    return normalizeFileText(JSON.stringify(config, jsonReplacer, 4));
}

function jsonReplacer(this: CopyGroup | CopyOpItem, key: string, value: unknown): unknown {
    if (key === "uid") {
        return undefined;
    }
    if (key === "stopDpAgent" || key === "requireElevated" || key === "renameLocked") {
        return value === true ? true : undefined;
    }
    // Item operation names are optional: persist only when customized.
    if (key === "name" && isCopyOpItem(this as CopyNode)) {
        const custom = typeof value === "string" ? value.trim() : "";
        if (!custom || custom === sourceFileBaseName((this as CopyOpItem).sourceFile)) {
            return undefined;
        }
        return custom;
    }
    if (key === "comment") {
        return typeof value === "string" && value.trim() === "" ? undefined : value;
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
    // Dirty means the live tree differs from the last load/save/import baseline —
    // not merely that no copy.json exists on disk yet.
    return buildCopyFileText(store.config) !== store.baseline;
}

export function parseCopyJson(text: string): CopyConfig {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as CopyConfig).groups)) {
        throw new Error("Invalid copy.json: expected { groups: [...] }");
    }
    const config = parsed as CopyConfig;
    normalizeOptionalComment(config);
    config.groups = config.groups.map((group) => normalizeGroup(group));
    return config;
}

function normalizeGroup(raw: unknown): CopyGroup {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid copy.json: group must be an object");
    }
    const group = raw as CopyGroup & { groups?: unknown[]; };
    if (typeof group.name !== "string") {
        group.name = "Group";
    }
    normalizeOptionalComment(group);

    const children: CopyNode[] = [];
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

function normalizeNode(raw: unknown): CopyNode {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid copy.json: item must be an object");
    }
    const node = raw as CopyNode & { items?: unknown; sourceFile?: unknown; separator?: unknown; };
    if (node.separator === true) {
        return normalizeSeparator(node);
    }
    // Nested group: has items[] and is not a copy item.
    if (Array.isArray(node.items) && !("sourceFile" in node)) {
        return normalizeGroup(node);
    }
    return normalizeItem(node);
}

function normalizeSeparator(raw: object): CopySeparator {
    const separator: CopySeparator = { separator: true };
    const comment = typeof (raw as CopySeparator).comment === "string" ? (raw as CopySeparator).comment : undefined;
    if (comment !== undefined) {
        separator.comment = comment;
        normalizeOptionalComment(separator);
    }
    return separator;
}

function normalizeItem(raw: object): CopyOpItem {
    const item = raw as CopyOpItem;
    item.sourceFile = typeof item.sourceFile === "string" ? item.sourceFile : "";
    item.destFolder = typeof item.destFolder === "string" ? item.destFolder : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (name && name !== sourceFileBaseName(item.sourceFile)) {
        item.name = name;
    } else {
        delete item.name;
    }
    normalizeOptionalComment(item);
    // Items must not carry a nested items array.
    if ("items" in item) {
        delete (item as { items?: unknown; }).items;
    }
    return item;
}
