// Editable model for copy.json. Groups are flat under a fixed "Groups" root;
// each group holds copy-operation items (source file → destination folder).

export type CopyOpItem = {
    sourceFile: string;
    destFolder: string;
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

export function itemLabel(item: Pick<CopyOpItem, "sourceFile">): string {
    const src = item.sourceFile.trim();
    if (!src) {
        return "(no source)";
    }
    const parts = src.replace(/\//g, "\\").split("\\");
    return parts[parts.length - 1] || src;
}
