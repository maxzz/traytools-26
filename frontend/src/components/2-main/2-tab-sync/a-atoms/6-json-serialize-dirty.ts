import { normalizeOptionalComment } from "@/components/2-main/a-shared/props-3-field-comment";
import { skipPatternsFromUnknown, skipPatternsToJson } from "../5-skip-patterns/b-1-skip-patterns";
import {
    type SyncConfig,
    type SyncEditorStore,
    type SyncGroup,
    type SyncNode,
    type SyncOpItem,
    type SyncSeparator,
    folderBaseName,
    isSyncGroup,
    isSyncOpItem,
} from "./9-types-sync";

export function buildSyncFileText(config: SyncConfig): string {
    return normalizeFileText(JSON.stringify(config, jsonReplacer, 4));
}

/** Same formatting rules as the file, for one group / item / separator subtree. */
export function buildNodeFileText(node: SyncNode): string {
    return normalizeFileText(JSON.stringify(node, jsonReplacer, 4));
}

/** Snapshot each node's file text under its runtime uid (for per-row dirty dots). */
export function collectNodeTextsByUid(config: SyncConfig): Record<string, string> {
    const out: Record<string, string> = {};
    walkNodes(config.groups, (node) => {
        if (node.uid) {
            out[node.uid] = buildNodeFileText(node);
        }
    });
    return out;
}

export function captureBaselineNodes(store: SyncEditorStore): void {
    store.baselineNodeTextByUid = collectNodeTextsByUid(store.config);
    store.dirtyUids = [];
}

function walkNodes(nodes: readonly SyncNode[], visit: (node: SyncNode) => void): void {
    for (const node of nodes) {
        visit(node);
        if (isSyncGroup(node)) {
            walkNodes(node.items, visit);
        }
    }
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
    if (key === "comment") {
        return typeof value === "string" && value.trim() === "" ? undefined : value;
    }
    // Missing field / default .git+node_modules list → omit. [] → persist [] (copy all).
    if (key === "skipPatterns") {
        return skipPatternsToJson(value);
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
    const dirtyUids = computeDirtyUids(store);
    if (!sameUidList(store.dirtyUids, dirtyUids)) {
        store.dirtyUids = dirtyUids;
    }
}

function computeDirty(store: SyncEditorStore): boolean {
    // Dirty means the live tree differs from the last load/save/import baseline —
    // not merely that no sync.json exists on disk yet.
    return buildSyncFileText(store.config) !== store.baseline;
}

function computeDirtyUids(store: SyncEditorStore): string[] {
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

export function parseSyncJson(text: string): SyncConfig {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as SyncConfig).groups)) {
        throw new Error("Invalid sync.json: expected { groups: [...] }");
    }
    const config = parsed as SyncConfig;
    normalizeOptionalComment(config);
    config.groups = config.groups.map((group) => normalizeGroup(group));
    ensureSkipPatternsOnConfig(config);
    return config;
}

/** Fill missing skipPatterns on cached / in-memory trees (parseSyncJson already does this). */
export function ensureSkipPatternsOnConfig(config: SyncConfig): void {
    walkNodes(config.groups, (node) => {
        if (isSyncOpItem(node) && !Array.isArray(node.skipPatterns)) {
            node.skipPatterns = skipPatternsFromUnknown(undefined, false);
        }
    });
}

function normalizeGroup(raw: unknown): SyncGroup {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid sync.json: group must be an object");
    }
    const group = raw as SyncGroup & { groups?: unknown[]; };
    if (typeof group.name !== "string") {
        group.name = "Group";
    }
    normalizeOptionalComment(group);

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

function normalizeSeparator(raw: object): SyncSeparator {
    const separator: SyncSeparator = { separator: true };
    const comment = typeof (raw as SyncSeparator).comment === "string" ? (raw as SyncSeparator).comment : undefined;
    if (comment !== undefined) {
        separator.comment = comment;
        normalizeOptionalComment(separator);
    }
    return separator;
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
    normalizeOptionalComment(item);
    item.skipPatterns = skipPatternsFromUnknown(item.skipPatterns, "skipPatterns" in item);
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
