import { normalizeOptionalComment } from "@/components/2-main/a-shared/field-comment";
import {
    type CopyConfig,
    type CopyEditorStore,
    type CopyGroup,
    type CopyNode,
    type CopyOpItem,
    type CopySeparator,
    isCopyGroup,
    isCopyOpItem,
    sourceFileBaseName,
} from "./9-types-copy";

export function buildCopyFileText(config: CopyConfig): string {
    return normalizeFileText(JSON.stringify(config, jsonReplacer, 4));
}

/** Same formatting rules as the file, for one group / item / separator subtree. */
export function buildNodeFileText(node: CopyNode): string {
    return normalizeFileText(JSON.stringify(node, jsonReplacer, 4));
}

/** Snapshot each node's file text under its runtime uid (for per-row dirty dots). */
export function collectNodeTextsByUid(config: CopyConfig): Record<string, string> {
    const out: Record<string, string> = {};
    walkNodes(config.groups, (node) => {
        if (node.uid) {
            out[node.uid] = buildNodeFileText(node);
        }
    });
    return out;
}

export function captureBaselineNodes(store: CopyEditorStore): void {
    store.baselineNodeTextByUid = collectNodeTextsByUid(store.config);
    store.dirtyUids = [];
}

function walkNodes(nodes: readonly CopyNode[], visit: (node: CopyNode) => void): void {
    for (const node of nodes) {
        visit(node);
        if (isCopyGroup(node)) {
            walkNodes(node.items, visit);
        }
    }
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
    const dirtyUids = computeDirtyUids(store);
    if (!sameUidList(store.dirtyUids, dirtyUids)) {
        store.dirtyUids = dirtyUids;
    }
}

function computeDirty(store: CopyEditorStore): boolean {
    // Dirty means the live tree differs from the last load/save/import baseline —
    // not merely that no copy.json exists on disk yet.
    return buildCopyFileText(store.config) !== store.baseline;
}

function computeDirtyUids(store: CopyEditorStore): string[] {
    const dirtyUids: string[] = [];
    walkNodes(store.config.groups, (node) => {
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
