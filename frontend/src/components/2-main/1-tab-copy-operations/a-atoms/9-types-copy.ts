// Editable model for copy.json. Groups are flat under a fixed "Groups" root;
// each group holds copy-operation items (source file → destination folder).

export type CopyOpItem = {
    sourceFile: string;
    destFolder: string;
    /** Display name; omitted from copy.json when empty or equal to the source basename. */
    name?: string;
    stopDpAgent?: boolean;
    requireElevated?: boolean;
    // Runtime-only identity for selection / DnD; stripped on serialize.
    uid?: string;
};

export type CopyGroup = {
    name: string;
    stopDpAgent?: boolean;
    requireElevated?: boolean;
    items: CopyOpItem[];
    uid?: string;
};

export type CopyConfig = {
    groups: CopyGroup[];
};

export type CopyNodeKind = "root" | "group" | "item";

export type AddCopyKind = "group" | "item";

export type CopySource = "default" | "file" | "storage" | "import";

export type CopyEditorStore = {
    config: CopyConfig;
    rootUid: string;
    source: CopySource;
    path: string;
    baseline: string;
    fileExists: boolean;
    dirty: boolean;
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

export function ensureUids(config: CopyConfig, rootUidHolder: { rootUid: string; }): void {
    const existing: string[] = [];
    if (rootUidHolder.rootUid) {
        existing.push(rootUidHolder.rootUid);
    }
    for (const group of config.groups) {
        if (group.uid) {
            existing.push(group.uid);
        }
        for (const item of group.items) {
            if (item.uid) {
                existing.push(item.uid);
            }
        }
    }
    seedUidCounterFrom(existing);

    if (!rootUidHolder.rootUid) {
        rootUidHolder.rootUid = newUid();
    }

    const used = new Set<string>([rootUidHolder.rootUid]);
    for (const group of config.groups) {
        if (!group.uid || used.has(group.uid)) {
            group.uid = newUid();
        }
        used.add(group.uid);
        for (const item of group.items) {
            if (!item.uid || used.has(item.uid)) {
                item.uid = newUid();
            }
            used.add(item.uid);
        }
    }
}

export function createGroup(): CopyGroup {
    return { uid: newUid(), name: "New Group", items: [], stopDpAgent: false, requireElevated: false };
}

export function createItem(): CopyOpItem {
    return {
        uid: newUid(),
        sourceFile: "",
        destFolder: "",
        stopDpAgent: false,
        requireElevated: false,
    };
}

// ---------------------------------------------------------------------------
// Lookups

export type GroupLocation = {
    kind: "group";
    group: CopyGroup;
    index: number;
};

export type ItemLocation = {
    kind: "item";
    item: CopyOpItem;
    group: CopyGroup;
    groupIndex: number;
    index: number;
};

export type CopyLocation = GroupLocation | ItemLocation;

export function findByUid(config: CopyConfig, uid: string): CopyLocation | null {
    for (let groupIndex = 0; groupIndex < config.groups.length; groupIndex++) {
        const group = config.groups[groupIndex];
        if (group.uid === uid) {
            return { kind: "group", group, index: groupIndex };
        }
        for (let index = 0; index < group.items.length; index++) {
            const item = group.items[index];
            if (item.uid === uid) {
                return { kind: "item", item, group, groupIndex, index };
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

export type CopySelectionPath =
    | { kind: "root"; }
    | { kind: "group"; groupIndex: number; }
    | { kind: "item"; groupIndex: number; itemIndex: number; };

export function selectionPathFromUid(
    config: CopyConfig,
    rootUid: string,
    uid: string | null | undefined,
): CopySelectionPath {
    if (!uid || uid === rootUid) {
        return { kind: "root" };
    }
    const loc = findByUid(config, uid);
    if (!loc) {
        return { kind: "root" };
    }
    if (loc.kind === "group") {
        return { kind: "group", groupIndex: loc.index };
    }
    return { kind: "item", groupIndex: loc.groupIndex, itemIndex: loc.index };
}

export function uidFromSelectionPath(
    config: CopyConfig,
    rootUid: string,
    path: CopySelectionPath | null | undefined,
): string {
    if (!path || path.kind === "root") {
        return rootUid;
    }
    if (path.kind === "group") {
        return config.groups[path.groupIndex]?.uid ?? rootUid;
    }
    const group = config.groups[path.groupIndex];
    return group?.items[path.itemIndex]?.uid ?? rootUid;
}

export function parseCopySelectionPath(value: unknown): CopySelectionPath | null {
    if (!value || typeof value !== "object") {
        return null;
    }
    const path = value as Partial<CopySelectionPath>;
    if (path.kind === "root") {
        return { kind: "root" };
    }
    if (path.kind === "group" && Number.isInteger(path.groupIndex) && path.groupIndex! >= 0) {
        return { kind: "group", groupIndex: path.groupIndex! };
    }
    if (
        path.kind === "item"
        && Number.isInteger(path.groupIndex) && path.groupIndex! >= 0
        && Number.isInteger(path.itemIndex) && path.itemIndex! >= 0
    ) {
        return { kind: "item", groupIndex: path.groupIndex!, itemIndex: path.itemIndex! };
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
