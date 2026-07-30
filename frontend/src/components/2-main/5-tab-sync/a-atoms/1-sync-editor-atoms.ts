import { nextNumberedName } from "../../a-shared/numbered-name";
import {
    type AddSyncKind,
    type SyncConfig,
    type SyncGroup,
    type SyncNode,
    type SyncOpItem,
    cloneGroup,
    cloneItem,
    containsGroup,
    createGroup,
    createItem,
    findByUid,
    isSyncGroup,
    isSyncOpItem,
    itemLabel,
} from "./9-types-sync";
import { syncEditorStore } from "./0-sync-local-storage";

export function isRootUid(uid: string | null | undefined): boolean {
    return !!uid && uid === syncEditorStore.rootUid;
}

export function getGroup(uid: string): SyncGroup | null {
    const loc = findByUid(syncEditorStore.config, uid);
    return loc?.kind === "group" ? loc.group : null;
}

export function getItem(uid: string): SyncOpItem | null {
    const loc = findByUid(syncEditorStore.config, uid);
    return loc?.kind === "item" ? loc.item : null;
}

export function addNode(kind: AddSyncKind): void {
    const config = syncEditorStore.config;
    const selUid = syncEditorStore.selectedUid;

    if (kind === "group") {
        const group = createGroup();
        if (selUid && !isRootUid(selUid)) {
            const loc = findByUid(config, selUid);
            if (loc?.kind === "group") {
                // Nest inside the selected group.
                loc.group.items.push(group);
            } else if (loc?.kind === "item") {
                // Sibling after the selected item in the same parent list.
                loc.siblings.splice(loc.index + 1, 0, group);
            } else {
                config.groups.push(group);
            }
        } else {
            config.groups.push(group);
        }
        syncEditorStore.selectedUid = group.uid!;
        return;
    }

    // Add sync item
    const item = createItem();
    if (selUid && !isRootUid(selUid)) {
        const loc = findByUid(config, selUid);
        if (loc?.kind === "group") {
            loc.group.items.push(item);
        } else if (loc?.kind === "item") {
            loc.siblings.splice(loc.index + 1, 0, item);
        } else {
            ensureGroupThenPush(config, item);
        }
    } else {
        ensureGroupThenPush(config, item);
    }
    syncEditorStore.selectedUid = item.uid!;
}

function ensureGroupThenPush(config: SyncConfig, item: SyncOpItem): void {
    if (config.groups.length === 0) {
        const group = createGroup();
        group.items = [item];
        config.groups.push(group);
        return;
    }
    config.groups[config.groups.length - 1].items.push(item);
}

export function removeNode(uid: string): void {
    if (isRootUid(uid)) {
        return;
    }
    const loc = findByUid(syncEditorStore.config, uid);
    if (!loc) {
        return;
    }

    loc.siblings.splice(loc.index, 1);
    if (syncEditorStore.selectedUid !== uid) {
        return;
    }

    const next = loc.siblings[loc.index] ?? loc.siblings[loc.index - 1];
    if (next) {
        syncEditorStore.selectedUid = next.uid ?? null;
        return;
    }
    if (loc.kind === "group") {
        syncEditorStore.selectedUid = loc.parent?.uid ?? syncEditorStore.rootUid;
        return;
    }
    syncEditorStore.selectedUid = loc.group.uid ?? syncEditorStore.rootUid;
}

export type DropPosition = "before" | "after" | "inside";

export function moveNode(dragUid: string, targetUid: string, position: DropPosition): boolean {
    if (dragUid === targetUid || isRootUid(dragUid)) {
        return false;
    }

    const config = syncEditorStore.config;
    const drag = findByUid(config, dragUid);
    if (!drag) {
        return false;
    }

    // Dropping on root: groups append at root; items need a group.
    if (isRootUid(targetUid)) {
        if (position !== "inside" && position !== "after" && position !== "before") {
            return false;
        }
        if (drag.kind === "group") {
            if (drag.parent) {
                // Nested group → promote to root.
                const [moved] = drag.siblings.splice(drag.index, 1) as SyncGroup[];
                config.groups.push(moved);
            } else {
                const [moved] = config.groups.splice(drag.index, 1);
                config.groups.push(moved);
            }
            return true;
        }
        const [moved] = drag.siblings.splice(drag.index, 1);
        if (!isSyncOpItem(moved)) {
            return false;
        }
        if (config.groups.length === 0) {
            const g = createGroup();
            g.items = [moved];
            config.groups.push(g);
        } else {
            config.groups[config.groups.length - 1].items.push(moved);
        }
        return true;
    }

    const target = findByUid(config, targetUid);
    if (!target) {
        return false;
    }

    if (drag.kind === "group") {
        if (target.kind === "group" && containsGroup(drag.group, target.group)) {
            return false;
        }
        if (target.kind === "item" && containsGroup(drag.group, target.group)) {
            return false;
        }

        const [moved] = drag.siblings.splice(drag.index, 1);
        if (!isSyncGroup(moved)) {
            return false;
        }

        if (target.kind === "group") {
            if (position === "inside") {
                target.group.items.push(moved);
                return true;
            }
            const after = findByUid(config, targetUid);
            if (!after || after.kind !== "group") {
                drag.siblings.splice(drag.index, 0, moved);
                return false;
            }
            // Root-level target: only groups may sit in config.groups.
            if (!after.parent) {
                const gi = config.groups.findIndex((g) => g.uid === targetUid);
                if (gi < 0) {
                    drag.siblings.splice(drag.index, 0, moved);
                    return false;
                }
                const insertAt = position === "before" ? gi : gi + 1;
                config.groups.splice(insertAt, 0, moved);
                return true;
            }
            const insertAt = position === "before" ? after.index : after.index + 1;
            after.siblings.splice(insertAt, 0, moved);
            return true;
        }

        // target is item — place as sibling in the same list.
        const after = findByUid(config, targetUid);
        if (!after || after.kind !== "item") {
            drag.siblings.splice(drag.index, 0, moved);
            return false;
        }
        const insertAt = position === "after" ? after.index + 1 : after.index;
        after.siblings.splice(insertAt, 0, moved);
        return true;
    }

    // drag is item
    const [moved] = drag.siblings.splice(drag.index, 1);
    if (!isSyncOpItem(moved)) {
        return false;
    }

    if (target.kind === "group") {
        if (position === "before") {
            target.group.items.unshift(moved);
        } else {
            // inside / after → append inside the group
            target.group.items.push(moved);
        }
        return true;
    }

    const after = findByUid(config, targetUid);
    if (!after || after.kind !== "item") {
        drag.siblings.splice(drag.index, 0, moved);
        return false;
    }
    const insertAt = position === "before" ? after.index : after.index + 1;
    after.siblings.splice(insertAt, 0, moved);
    return true;
}

/** Insert a clone of dragUid relative to targetUid (same placement rules as moveNode). */
export function copyNode(dragUid: string, targetUid: string, position: DropPosition): boolean {
    if (isRootUid(dragUid)) {
        return false;
    }

    const config = syncEditorStore.config;
    const drag = findByUid(config, dragUid);
    if (!drag) {
        return false;
    }

    if (isRootUid(targetUid)) {
        if (position !== "inside" && position !== "after" && position !== "before") {
            return false;
        }
        if (drag.kind === "group") {
            const cloned = cloneGroup(drag.group);
            uniquifyGroupName(cloned, config.groups);
            config.groups.push(cloned);
            syncEditorStore.selectedUid = cloned.uid!;
            return true;
        }
        const cloned = cloneItem(drag.item);
        if (config.groups.length === 0) {
            const g = createGroup();
            g.items = [cloned];
            config.groups.push(g);
        } else {
            const dest = config.groups[config.groups.length - 1];
            uniquifyItemName(cloned, dest.items);
            dest.items.push(cloned);
        }
        syncEditorStore.selectedUid = cloned.uid!;
        return true;
    }

    const target = findByUid(config, targetUid);
    if (!target) {
        return false;
    }

    if (drag.kind === "group") {
        const cloned = cloneGroup(drag.group);
        if (target.kind === "group") {
            if (position === "inside") {
                uniquifyGroupName(cloned, target.group.items);
                target.group.items.push(cloned);
            } else if (!target.parent) {
                uniquifyGroupName(cloned, config.groups);
                const gi = config.groups.findIndex((g) => g.uid === targetUid);
                if (gi < 0) {
                    return false;
                }
                const insertAt = position === "before" ? gi : gi + 1;
                config.groups.splice(insertAt, 0, cloned);
            } else {
                uniquifyGroupName(cloned, target.siblings);
                const insertAt = position === "before" ? target.index : target.index + 1;
                target.siblings.splice(insertAt, 0, cloned);
            }
            syncEditorStore.selectedUid = cloned.uid!;
            return true;
        }
        uniquifyGroupName(cloned, target.siblings);
        const insertAt = position === "after" ? target.index + 1 : target.index;
        target.siblings.splice(insertAt, 0, cloned);
        syncEditorStore.selectedUid = cloned.uid!;
        return true;
    }

    const cloned = cloneItem(drag.item);
    if (target.kind === "group") {
        uniquifyItemName(cloned, target.group.items);
        if (position === "before") {
            target.group.items.unshift(cloned);
        } else {
            target.group.items.push(cloned);
        }
        syncEditorStore.selectedUid = cloned.uid!;
        return true;
    }

    uniquifyItemName(cloned, target.siblings);
    const insertAt = position === "before" ? target.index : target.index + 1;
    target.siblings.splice(insertAt, 0, cloned);
    syncEditorStore.selectedUid = cloned.uid!;
    return true;
}

function uniquifyGroupName(group: SyncGroup, siblings: SyncNode[]): void {
    const names = siblings.filter(isSyncGroup).map((g) => g.name);
    group.name = nextNumberedName(group.name || "New Group", names);
}

function uniquifyItemName(item: SyncOpItem, siblings: SyncNode[]): void {
    const names = siblings.filter(isSyncOpItem).map(itemLabel);
    item.name = nextNumberedName(itemLabel(item), names);
}

/**
 * Add OS-dropped source folders into the tree:
 * - root → new group containing the items
 * - group → append items to that group
 * - item → append items to the parent group
 */
export function addDroppedFolders(targetUid: string, sourceFolders: string[]): boolean {
    const paths = sourceFolders.map((p) => p.trim()).filter(Boolean);
    if (!paths.length) {
        return false;
    }

    const config = syncEditorStore.config;

    if (isRootUid(targetUid)) {
        const items = makeItemsFromPaths(paths, []);
        const group = createGroup(items);
        uniquifyGroupName(group, config.groups);
        config.groups.push(group);
        syncEditorStore.selectedUid = items[0]?.uid ?? group.uid!;
        return true;
    }

    const loc = findByUid(config, targetUid);
    if (!loc) {
        return false;
    }

    if (loc.kind === "group") {
        const items = makeItemsFromPaths(paths, loc.group.items);
        loc.group.items.push(...items);
        syncEditorStore.selectedUid = items[0]?.uid ?? loc.group.uid!;
        return true;
    }

    const items = makeItemsFromPaths(paths, loc.siblings);
    loc.siblings.push(...items);
    syncEditorStore.selectedUid = items[0]?.uid ?? loc.item.uid!;
    return true;
}

function makeItemsFromPaths(paths: string[], siblings: SyncNode[]): SyncOpItem[] {
    const created: SyncOpItem[] = [];
    for (const path of paths) {
        const item = createItem();
        item.sourceFolder = path;
        uniquifyItemName(item, [...siblings, ...created]);
        created.push(item);
    }
    return created;
}
