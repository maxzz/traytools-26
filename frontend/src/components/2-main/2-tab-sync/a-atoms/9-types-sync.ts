import { defaultSkipPatterns } from "../5-skip-patterns/b-skip-patterns";

// Editable model for sync.json. Top-level groups sit under a fixed "Groups"
// root. Each group's `items` is an ordered list of sync-operation items, nested
// groups, and/or separators (source folder ↔ destination folder).

export type SyncOpItem = {
    sourceFolder: string;
    destFolder: string;
    name?: string;         // Display name; omitted from sync.json when empty or equal to the source basename.
    forwardName?: string;  // Optional tooltip label for Sync → (source → destination). Omitted from sync.json when empty.
    reverseName?: string;  // Optional tooltip label for Sync ← (destination → source). Omitted from sync.json when empty.
    comment?: string;      // Optional note stored in sync.json; omitted when empty.
    /**
     * Regular expressions skipped during Check and Sync. Omitted from sync.json
     * when equal to the built-in `^\.git$` / `^node_modules$` list. An empty
     * array means skip nothing.
     */
    skipPatterns?: string[];
    uid?: string;          // Runtime-only identity for selection / DnD; stripped on serialize.
};

export type SyncGroup = {
    name: string;
    /** Optional note stored in sync.json; omitted when empty. */
    comment?: string;
    /** Ordered children: sync items, nested groups, and/or separators. */
    items: SyncNode[];
    uid?: string;
};

/** Visual divider in a group's item list. Persists as `{ "separator": true }`. */
export type SyncSeparator = {
    separator: true;
    /** Optional note stored in sync.json; omitted when empty. */
    comment?: string;
    uid?: string;
};

/** A child of a group: sync item, nested group, or separator. */
export type SyncNode = SyncOpItem | SyncGroup | SyncSeparator;

export function isSyncSeparator(node: SyncNode): node is SyncSeparator {
    return (node as SyncSeparator).separator === true;
}

export function isSyncGroup(node: SyncNode): node is SyncGroup {
    return !isSyncSeparator(node) && Array.isArray((node as SyncGroup).items) && !("sourceFolder" in node);
}

export function isSyncOpItem(node: SyncNode): node is SyncOpItem {
    return !isSyncSeparator(node) && "sourceFolder" in node;
}

export type SyncConfig = {
    /** Optional note for the tree root; omitted from sync.json when empty. */
    comment?: string;
    groups: SyncGroup[];
};

export type SyncNodeKind = "root" | "group" | "item" | "separator";
export type AddSyncKind = "group" | "item" | "separator";
export type SyncSource = "default" | "file" | "storage" | "import";

export type SyncEditorStore = {
    config: SyncConfig;
    rootUid: string;
    source: SyncSource;
    path: string;
    baseline: string;
    /**
     * Per-node file text at the last load/save/import, keyed by runtime uid.
     * Used to mark which tree rows differ from the baseline.
     */
    baselineNodeTextByUid: Record<string, string>;
    fileExists: boolean;
    dirty: boolean;
    /** Runtime uids whose serialized content differs from {@link baselineNodeTextByUid}. */
    dirtyUids: string[];
    status: string;
    error: string;
    selectedUid: string | null;
};

// ---------------------------------------------------------------------------
// Stable runtime ids
//
// The synthetic "Groups" root has its own uid (not part of the JSON tree). On
// reload the counter resets to 0 while a cached rootUid like "s1" may remain,
// so the next newUid() for a group/item would collide with the root and make
// two rows appear selected. Seed from existing ids and reject duplicates.

let uidCounter = 0;

function newUid(): string {
    uidCounter += 1;
    return `s${uidCounter}`;
}

function seedUidCounterFrom(uids: Iterable<string>): void {
    for (const uid of uids) {
        const m = /^s(\d+)$/.exec(uid);
        if (m) {
            uidCounter = Math.max(uidCounter, Number(m[1]));
        }
    }
}

function collectExistingUids(nodes: SyncNode[], into: string[]): void {
    for (const node of nodes) {
        if (node.uid) {
            into.push(node.uid);
        }
        if (isSyncGroup(node)) {
            collectExistingUids(node.items, into);
        }
    }
}

function assignUids(nodes: SyncNode[], used: Set<string>): void {
    for (const node of nodes) {
        if (!node.uid || used.has(node.uid)) {
            node.uid = newUid();
        }
        used.add(node.uid);
        if (isSyncGroup(node)) {
            assignUids(node.items, used);
        }
    }
}

export function ensureUids(config: SyncConfig, rootUidHolder: { rootUid: string; }): void {
    const existing: string[] = [];
    if (rootUidHolder.rootUid) {
        existing.push(rootUidHolder.rootUid);
    }
    collectExistingUids(config.groups, existing);
    seedUidCounterFrom(existing);

    if (!rootUidHolder.rootUid) {
        rootUidHolder.rootUid = newUid();
    }

    const used = new Set<string>([rootUidHolder.rootUid]);
    assignUids(config.groups, used);
}

export function createGroup(items?: SyncNode[]): SyncGroup {
    return {
        uid: newUid(),
        name: "New Group",
        items: items ?? [createItem()],
    };
}

export function createItem(): SyncOpItem {
    return {
        uid: newUid(),
        sourceFolder: "",
        destFolder: "",
        skipPatterns: defaultSkipPatterns(),
    };
}

export function createSeparator(): SyncSeparator {
    return {
        uid: newUid(),
        separator: true,
    };
}

/** Deep-clone a group (and nested nodes) with fresh runtime uids. */
export function cloneGroup(group: SyncGroup): SyncGroup {
    // JSON round-trip: structuredClone cannot clone valtio proxies.
    const clone = JSON.parse(JSON.stringify(group)) as SyncGroup;
    reassignNodeUids(clone);
    return clone;
}

function reassignNodeUids(node: SyncNode): void {
    node.uid = newUid();
    if (isSyncGroup(node)) {
        for (const child of node.items ?? []) {
            reassignNodeUids(child);
        }
    }
}

/** Deep-clone a sync item with a fresh runtime uid. */
export function cloneItem(item: SyncOpItem): SyncOpItem {
    // JSON round-trip: structuredClone cannot clone valtio proxies.
    const clone = JSON.parse(JSON.stringify(item)) as SyncOpItem;
    clone.uid = newUid();
    return clone;
}

/** Clone a separator with a fresh runtime uid. */
export function cloneSeparator(separator: SyncSeparator): SyncSeparator {
    const clone = createSeparator();
    if (separator.comment?.trim()) {
        clone.comment = separator.comment;
    }
    return clone;
}

/** Flatten all sync items under a group, including nested groups (depth-first). */
export function collectGroupItems(group: SyncGroup): SyncOpItem[] {
    const out: SyncOpItem[] = [];
    for (const node of group.items ?? []) {
        if (isSyncOpItem(node)) {
            out.push(node);
        } else if (isSyncGroup(node)) {
            out.push(...collectGroupItems(node));
        }
    }
    return out;
}

/** True when `maybeAncestor` is `group` or contains it somewhere below. */
export function containsGroup(maybeAncestor: SyncGroup, group: SyncGroup): boolean {
    if (maybeAncestor === group || (!!maybeAncestor.uid && maybeAncestor.uid === group.uid)) {
        return true;
    }
    for (const node of maybeAncestor.items ?? []) {
        if (isSyncGroup(node) && containsGroup(node, group)) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Lookups

export type GroupLocation = {
    kind: "group";
    group: SyncGroup;
    siblings: SyncNode[];     // Array that contains `group` (`config.groups` or a parent's `items`).
    index: number;
    parent: SyncGroup | null; // Immediate parent group, or null when under the root.
};

export type ItemLocation = {
    kind: "item";
    item: SyncOpItem;
    group: SyncGroup;
    siblings: SyncNode[];
    index: number;
};

export type SeparatorLocation = {
    kind: "separator";
    separator: SyncSeparator;
    group: SyncGroup;
    siblings: SyncNode[];
    index: number;
};

export type SyncLocation = GroupLocation | ItemLocation | SeparatorLocation;

export function findByUid(config: SyncConfig, uid: string): SyncLocation | null {
    // Root list is SyncGroup[]; nested lists are SyncNode[]. Both are spliced via siblings.
    return findInNodes(config.groups as SyncNode[], uid, null);
}

/** The root-level group that contains `uid`, or the group itself when it is top-level. */
export function findTopLevelGroup(config: SyncConfig, uid: string): SyncGroup | null {
    const path = walkSelectionPath(config.groups, uid, []);
    if (!path || path.kind === "root" || path.path.length === 0) {
        return null;
    }
    return config.groups[path.path[0]] ?? null;
}

function findInNodes(siblings: SyncNode[], uid: string, parent: SyncGroup | null): SyncLocation | null {
    for (let index = 0; index < siblings.length; index++) {
        const node = siblings[index];
        if (node.uid === uid) {
            if (isSyncGroup(node)) {
                return { kind: "group", group: node, siblings, index, parent };
            }
            if (!parent) {
                return null;
            }
            if (isSyncSeparator(node)) {
                return { kind: "separator", separator: node, group: parent, siblings, index };
            }
            return { kind: "item", item: node, group: parent, siblings, index };
        }
        if (isSyncGroup(node)) {
            const found = findInNodes(node.items, uid, node);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Selection path (survives uid reassignment across elevation restarts)
//
// Runtime uids are regenerated when loading from sync.json, so selection must
// be persisted as a stable index path and remapped after ensureUids.
// `path` walks `config.groups` then nested `items` arrays.

export type SyncSelectionPath =
    | { kind: "root"; }
    | { kind: "group"; path: number[]; }
    | { kind: "item"; path: number[]; }
    | { kind: "separator"; path: number[]; };

export function selectionPathFromUid(config: SyncConfig, rootUid: string, uid: string | null | undefined): SyncSelectionPath {
    if (!uid || uid === rootUid) {
        return { kind: "root" };
    }
    return walkSelectionPath(config.groups, uid, []) ?? { kind: "root" };
}

function walkSelectionPath(nodes: SyncNode[], uid: string, path: number[]): SyncSelectionPath | null {
    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        const next = [...path, index];
        if (node.uid === uid) {
            if (isSyncGroup(node)) {
                return { kind: "group", path: next };
            }
            if (isSyncSeparator(node)) {
                return { kind: "separator", path: next };
            }
            return { kind: "item", path: next };
        }
        if (isSyncGroup(node)) {
            const found = walkSelectionPath(node.items, uid, next);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

function nodeAtPath(config: SyncConfig, path: number[]): SyncNode | undefined {
    if (path.length === 0) {
        return undefined;
    }
    let node: SyncNode | undefined = config.groups[path[0]];
    for (let i = 1; i < path.length; i++) {
        if (!node || !isSyncGroup(node)) {
            return undefined;
        }
        node = node.items[path[i]];
    }
    return node;
}

export function uidFromSelectionPath(config: SyncConfig, rootUid: string, path: SyncSelectionPath | null | undefined): string {
    if (!path || path.kind === "root") {
        return rootUid;
    }
    const node = nodeAtPath(config, path.path);
    if (!node) {
        return rootUid;
    }
    if (path.kind === "group") {
        return isSyncGroup(node) ? (node.uid ?? rootUid) : rootUid;
    }
    if (path.kind === "separator") {
        return isSyncSeparator(node) ? (node.uid ?? rootUid) : rootUid;
    }
    return isSyncOpItem(node) ? (node.uid ?? rootUid) : rootUid;
}

export function parseSyncSelectionPath(value: unknown): SyncSelectionPath | null {
    if (!value || typeof value !== "object") {
        return null;
    }
    const path = value as Partial<SyncSelectionPath> & {
        groupIndex?: number;
        itemIndex?: number;
        path?: number[];
        groupPath?: number[];
    };

    if (path.kind === "root") {
        return { kind: "root" };
    }

    const indexPath =
        Array.isArray(path.path)
            ? path.path
            : Array.isArray(path.groupPath)
                ? path.groupPath
                : null;

    if (
        (path.kind === "group" || path.kind === "item" || path.kind === "separator")
        && indexPath
        && indexPath.every((n) => Number.isInteger(n) && n >= 0)
    ) {
        return { kind: path.kind, path: indexPath };
    }

    // Legacy flat format: { groupIndex } / { groupIndex, itemIndex }
    if (path.kind === "group" && Number.isInteger(path.groupIndex) && path.groupIndex! >= 0) {
        return { kind: "group", path: [path.groupIndex!] };
    }

    if (path.kind === "item" && Number.isInteger(path.groupIndex) && path.groupIndex! >= 0 && Number.isInteger(path.itemIndex) && path.itemIndex! >= 0) {
        return { kind: "item", path: [path.groupIndex!, path.itemIndex!] };
    }

    return null;
}

export function folderBaseName(folder: string): string {
    const src = folder.trim();
    if (!src) {
        return "";
    }
    const parts = src.replace(/\//g, "\\").split("\\").filter(Boolean);
    return parts[parts.length - 1] || src;
}

export function itemLabel(item: Pick<SyncOpItem, "sourceFolder" | "name">): string {
    const custom = item.name?.trim();
    if (custom) {
        return custom;
    }
    return folderBaseName(item.sourceFolder) || "(no source)";
}

/** Custom Sync → / Sync ← tooltip name when set; otherwise undefined. */
export function syncDirectionName(item: Pick<SyncOpItem, "forwardName" | "reverseName">, direction: "forward" | "reverse",): string | undefined {
    const custom = (direction === "forward" ? item.forwardName : item.reverseName)?.trim();
    return custom || undefined;
}
