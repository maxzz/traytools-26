// Editable model for copy.json. Top-level groups sit under a fixed "Groups"
// root. Each group's `items` is an ordered list of copy-operation items, nested
// groups, and/or separators (source file → destination folder).

export type CopyOpItem = {
    sourceFile: string;
    destFolder: string;
    /** Display name; omitted from copy.json when empty or equal to the source basename. */
    name?: string;
    stopDpAgent?: boolean;
    requireElevated?: boolean;
    /** On Access Denied, rename locked dest to name_locked_N.ext and retry. */
    renameLocked?: boolean;
    /** Optional note stored in copy.json; omitted when empty. */
    comment?: string;
    // Runtime-only identity for selection / DnD; stripped on serialize.
    uid?: string;
};

export type CopyGroup = {
    name: string;
    stopDpAgent?: boolean;
    requireElevated?: boolean;
    /** On Access Denied, rename locked dest to name_locked_N.ext and retry. */
    renameLocked?: boolean;
    /** Optional note stored in copy.json; omitted when empty. */
    comment?: string;
    /** Ordered children: copy items, nested groups, and/or separators. */
    items: CopyNode[];
    uid?: string;
};

/** Visual divider in a group's item list. Persists as `{ "separator": true }`. */
export type CopySeparator = {
    separator: true;
    /** Optional note stored in copy.json; omitted when empty. */
    comment?: string;
    uid?: string;
};

/** A child of a group: copy item, nested group, or separator. */
export type CopyNode = CopyOpItem | CopyGroup | CopySeparator;

export function isCopySeparator(node: CopyNode): node is CopySeparator {
    return (node as CopySeparator).separator === true;
}

export function isCopyGroup(node: CopyNode): node is CopyGroup {
    return !isCopySeparator(node) && Array.isArray((node as CopyGroup).items) && !("sourceFile" in node);
}

export function isCopyOpItem(node: CopyNode): node is CopyOpItem {
    return !isCopySeparator(node) && "sourceFile" in node;
}

export type CopyConfig = {
    /** Optional note for the tree root; omitted from copy.json when empty. */
    comment?: string;
    groups: CopyGroup[];
};

export type CopyNodeKind = "root" | "group" | "item" | "separator";

export type AddCopyKind = "group" | "item" | "separator";

export type CopySource = "default" | "file" | "storage" | "import";

export type CopyEditorStore = {
    config: CopyConfig;
    rootUid: string;
    source: CopySource;
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
// reload the counter resets to 0 while a cached rootUid like "c1" may remain,
// so the next newUid() for a group/item would collide with the root and make
// two rows appear selected. Seed from existing ids and reject duplicates.

let uidCounter = 0;

function newUid(): string {
    uidCounter += 1;
    return `c${uidCounter}`;
}

function seedUidCounterFrom(uids: Iterable<string>): void {
    for (const uid of uids) {
        const m = /^c(\d+)$/.exec(uid);
        if (m) {
            uidCounter = Math.max(uidCounter, Number(m[1]));
        }
    }
}

function collectExistingUids(nodes: CopyNode[], into: string[]): void {
    for (const node of nodes) {
        if (node.uid) {
            into.push(node.uid);
        }
        if (isCopyGroup(node)) {
            collectExistingUids(node.items, into);
        }
    }
}

function assignUids(nodes: CopyNode[], used: Set<string>): void {
    for (const node of nodes) {
        if (!node.uid || used.has(node.uid)) {
            node.uid = newUid();
        }
        used.add(node.uid);
        if (isCopyGroup(node)) {
            assignUids(node.items, used);
        }
    }
}

export function ensureUids(config: CopyConfig, rootUidHolder: { rootUid: string; }): void {
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

export function createGroup(items?: CopyNode[]): CopyGroup {
    return {
        uid: newUid(),
        name: "New Group",
        items: items ?? [createItem()],
        stopDpAgent: false,
        requireElevated: false,
        renameLocked: false,
    };
}

export function createItem(): CopyOpItem {
    return {
        uid: newUid(),
        sourceFile: "",
        destFolder: "",
        stopDpAgent: false,
        requireElevated: false,
        renameLocked: false,
    };
}

export function createSeparator(): CopySeparator {
    return {
        uid: newUid(),
        separator: true,
    };
}

/** Deep-clone a group (and nested nodes) with fresh runtime uids. */
export function cloneGroup(group: CopyGroup): CopyGroup {
    // JSON round-trip: structuredClone cannot clone valtio proxies.
    const clone = JSON.parse(JSON.stringify(group)) as CopyGroup;
    reassignNodeUids(clone);
    return clone;
}

function reassignNodeUids(node: CopyNode): void {
    node.uid = newUid();
    if (isCopyGroup(node)) {
        for (const child of node.items ?? []) {
            reassignNodeUids(child);
        }
    }
}

/** Deep-clone a copy item with a fresh runtime uid. */
export function cloneItem(item: CopyOpItem): CopyOpItem {
    // JSON round-trip: structuredClone cannot clone valtio proxies.
    const clone = JSON.parse(JSON.stringify(item)) as CopyOpItem;
    clone.uid = newUid();
    return clone;
}

/** Clone a separator with a fresh runtime uid. */
export function cloneSeparator(separator: CopySeparator): CopySeparator {
    const clone = createSeparator();
    if (separator.comment?.trim()) {
        clone.comment = separator.comment;
    }
    return clone;
}

/** Flatten all copy items under a group, including nested groups (depth-first). */
export function collectGroupItems(group: CopyGroup): CopyOpItem[] {
    const out: CopyOpItem[] = [];
    for (const node of group.items ?? []) {
        if (isCopyOpItem(node)) {
            out.push(node);
        } else if (isCopyGroup(node)) {
            out.push(...collectGroupItems(node));
        }
    }
    return out;
}

/** True when `maybeAncestor` is `group` or contains it somewhere below. */
export function containsGroup(maybeAncestor: CopyGroup, group: CopyGroup): boolean {
    if (maybeAncestor === group || (!!maybeAncestor.uid && maybeAncestor.uid === group.uid)) {
        return true;
    }
    for (const node of maybeAncestor.items ?? []) {
        if (isCopyGroup(node) && containsGroup(node, group)) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Lookups

export type GroupLocation = {
    kind: "group";
    group: CopyGroup;
    /** Array that contains `group` (`config.groups` or a parent's `items`). */
    siblings: CopyNode[];
    index: number;
    /** Immediate parent group, or null when under the root. */
    parent: CopyGroup | null;
};

export type ItemLocation = {
    kind: "item";
    item: CopyOpItem;
    group: CopyGroup;
    siblings: CopyNode[];
    index: number;
};

export type SeparatorLocation = {
    kind: "separator";
    separator: CopySeparator;
    group: CopyGroup;
    siblings: CopyNode[];
    index: number;
};

export type CopyLocation = GroupLocation | ItemLocation | SeparatorLocation;

export function findByUid(config: CopyConfig, uid: string): CopyLocation | null {
    // Root list is CopyGroup[]; nested lists are CopyNode[]. Both are spliced via siblings.
    return findInNodes(config.groups as CopyNode[], uid, null);
}

/** The root-level group that contains `uid`, or the group itself when it is top-level. */
export function findTopLevelGroup(config: CopyConfig, uid: string): CopyGroup | null {
    const path = walkSelectionPath(config.groups, uid, []);
    if (!path || path.kind === "root" || path.path.length === 0) {
        return null;
    }
    return config.groups[path.path[0]] ?? null;
}

function findInNodes(
    siblings: CopyNode[],
    uid: string,
    parent: CopyGroup | null,
): CopyLocation | null {
    for (let index = 0; index < siblings.length; index++) {
        const node = siblings[index];
        if (node.uid === uid) {
            if (isCopyGroup(node)) {
                return { kind: "group", group: node, siblings, index, parent };
            }
            if (!parent) {
                return null;
            }
            if (isCopySeparator(node)) {
                return { kind: "separator", separator: node, group: parent, siblings, index };
            }
            return { kind: "item", item: node, group: parent, siblings, index };
        }
        if (isCopyGroup(node)) {
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
// Runtime uids are regenerated when loading from copy.json, so selection must
// be persisted as a stable index path and remapped after ensureUids.
// `path` walks `config.groups` then nested `items` arrays.

export type CopySelectionPath =
    | { kind: "root"; }
    | { kind: "group"; path: number[]; }
    | { kind: "item"; path: number[]; }
    | { kind: "separator"; path: number[]; };

export function selectionPathFromUid(
    config: CopyConfig,
    rootUid: string,
    uid: string | null | undefined,
): CopySelectionPath {
    if (!uid || uid === rootUid) {
        return { kind: "root" };
    }
    return walkSelectionPath(config.groups, uid, []) ?? { kind: "root" };
}

function walkSelectionPath(
    nodes: CopyNode[],
    uid: string,
    path: number[],
): CopySelectionPath | null {
    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        const next = [...path, index];
        if (node.uid === uid) {
            if (isCopyGroup(node)) {
                return { kind: "group", path: next };
            }
            if (isCopySeparator(node)) {
                return { kind: "separator", path: next };
            }
            return { kind: "item", path: next };
        }
        if (isCopyGroup(node)) {
            const found = walkSelectionPath(node.items, uid, next);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

function nodeAtPath(config: CopyConfig, path: number[]): CopyNode | undefined {
    if (path.length === 0) {
        return undefined;
    }
    let node: CopyNode | undefined = config.groups[path[0]];
    for (let i = 1; i < path.length; i++) {
        if (!node || !isCopyGroup(node)) {
            return undefined;
        }
        node = node.items[path[i]];
    }
    return node;
}

export function uidFromSelectionPath(
    config: CopyConfig,
    rootUid: string,
    path: CopySelectionPath | null | undefined,
): string {
    if (!path || path.kind === "root") {
        return rootUid;
    }
    const node = nodeAtPath(config, path.path);
    if (!node) {
        return rootUid;
    }
    if (path.kind === "group") {
        return isCopyGroup(node) ? (node.uid ?? rootUid) : rootUid;
    }
    if (path.kind === "separator") {
        return isCopySeparator(node) ? (node.uid ?? rootUid) : rootUid;
    }
    return isCopyOpItem(node) ? (node.uid ?? rootUid) : rootUid;
}

export function parseCopySelectionPath(value: unknown): CopySelectionPath | null {
    if (!value || typeof value !== "object") {
        return null;
    }
    const path = value as Partial<CopySelectionPath> & {
        groupIndex?: number;
        itemIndex?: number;
        path?: number[];
        groupPath?: number[];
    };
    if (path.kind === "root") {
        return { kind: "root" };
    }

    const indexPath = Array.isArray(path.path)
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
    if (
        path.kind === "item"
        && Number.isInteger(path.groupIndex) && path.groupIndex! >= 0
        && Number.isInteger(path.itemIndex) && path.itemIndex! >= 0
    ) {
        return { kind: "item", path: [path.groupIndex!, path.itemIndex!] };
    }
    return null;
}

export function sourceFileBaseName(sourceFile: string): string {
    const src = sourceFile.trim();
    if (!src) {
        return "";
    }
    const parts = src.replace(/\//g, "\\").split("\\");
    return parts[parts.length - 1] || src;
}

export function itemLabel(item: Pick<CopyOpItem, "sourceFile" | "name">): string {
    const custom = item.name?.trim();
    if (custom) {
        return custom;
    }
    return sourceFileBaseName(item.sourceFile) || "(no source)";
}
