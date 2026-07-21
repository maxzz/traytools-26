import {
    type AddCopyKind,
    type CopyConfig,
    type CopyGroup,
    type CopyOpItem,
    createGroup,
    createItem,
    findByUid,
} from "./9-types-copy";
import { copyEditorStore } from "./0-copy-local-storage";

export function isRootUid(uid: string | null | undefined): boolean {
    return !!uid && uid === copyEditorStore.rootUid;
}

export function getGroup(uid: string): CopyGroup | null {
    const loc = findByUid(copyEditorStore.config, uid);
    return loc?.kind === "group" ? loc.group : null;
}

export function getItem(uid: string): CopyOpItem | null {
    const loc = findByUid(copyEditorStore.config, uid);
    return loc?.kind === "item" ? loc.item : null;
}

export function addNode(kind: AddCopyKind): void {
    const config = copyEditorStore.config;
    const selUid = copyEditorStore.selectedUid;

    if (kind === "group") {
        const group = createGroup();
        if (selUid && !isRootUid(selUid)) {
            const loc = findByUid(config, selUid);
            if (loc?.kind === "group") {
                config.groups.splice(loc.index + 1, 0, group);
            } else if (loc?.kind === "item") {
                config.groups.splice(loc.groupIndex + 1, 0, group);
            } else {
                config.groups.push(group);
            }
        } else {
            config.groups.push(group);
        }
        copyEditorStore.selectedUid = group.uid!;
        return;
    }

    // Add copy item
    const item = createItem();
    if (selUid && !isRootUid(selUid)) {
        const loc = findByUid(config, selUid);
        if (loc?.kind === "group") {
            loc.group.items.push(item);
        } else if (loc?.kind === "item") {
            loc.group.items.splice(loc.index + 1, 0, item);
        } else {
            ensureGroupThenPush(config, item);
        }
    } else {
        ensureGroupThenPush(config, item);
    }
    copyEditorStore.selectedUid = item.uid!;
}

function ensureGroupThenPush(config: CopyConfig, item: CopyOpItem): void {
    if (config.groups.length === 0) {
        const group = createGroup();
        group.items.push(item);
        config.groups.push(group);
        return;
    }
    config.groups[config.groups.length - 1].items.push(item);
}

export function removeNode(uid: string): void {
    if (isRootUid(uid)) {
        return;
    }
    const loc = findByUid(copyEditorStore.config, uid);
    if (!loc) {
        return;
    }

    if (loc.kind === "group") {
        copyEditorStore.config.groups.splice(loc.index, 1);
        if (copyEditorStore.selectedUid === uid) {
            const next = copyEditorStore.config.groups[loc.index] ?? copyEditorStore.config.groups[loc.index - 1];
            copyEditorStore.selectedUid = next?.uid ?? copyEditorStore.rootUid;
        }
        return;
    }

    loc.group.items.splice(loc.index, 1);
    if (copyEditorStore.selectedUid === uid) {
        const next = loc.group.items[loc.index] ?? loc.group.items[loc.index - 1] ?? loc.group;
        copyEditorStore.selectedUid = next.uid ?? null;
    }
}

export type DropPosition = "before" | "after" | "inside";

export function moveNode(dragUid: string, targetUid: string, position: DropPosition): boolean {
    if (dragUid === targetUid || isRootUid(dragUid)) {
        return false;
    }

    const config = copyEditorStore.config;
    const drag = findByUid(config, dragUid);
    if (!drag) {
        return false;
    }

    // Dropping on root: groups append as groups; items need a group (append to last / create).
    if (isRootUid(targetUid)) {
        if (position !== "inside" && position !== "after" && position !== "before") {
            return false;
        }
        if (drag.kind === "group") {
            const [moved] = config.groups.splice(drag.index, 1);
            config.groups.push(moved);
            return true;
        }
        // Items cannot live at root — put into last group or create one.
        const [moved] = drag.group.items.splice(drag.index, 1);
        if (config.groups.length === 0) {
            const g = createGroup();
            g.items.push(moved);
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

    // Detach drag first.
    if (drag.kind === "group") {
        if (target.kind === "item") {
            // Groups cannot nest under items; treat as before/after the item's group.
            const [moved] = config.groups.splice(drag.index, 1);
            const after = findByUid(config, target.group.uid!);
            if (!after || after.kind !== "group") {
                config.groups.splice(drag.index, 0, moved);
                return false;
            }
            // Re-find index after splice
            const gi = config.groups.findIndex((g) => g.uid === target.group.uid);
            const insertAt = position === "after" ? gi + 1 : gi;
            config.groups.splice(insertAt, 0, moved);
            return true;
        }
        // target is group
        if (position === "inside") {
            // Cannot nest groups — reorder after target instead.
            const [moved] = config.groups.splice(drag.index, 1);
            const gi = config.groups.findIndex((g) => g.uid === targetUid);
            config.groups.splice(gi + 1, 0, moved);
            return true;
        }
        const [moved] = config.groups.splice(drag.index, 1);
        const gi = config.groups.findIndex((g) => g.uid === targetUid);
        if (gi < 0) {
            config.groups.splice(drag.index, 0, moved);
            return false;
        }
        const insertAt = position === "before" ? gi : gi + 1;
        config.groups.splice(insertAt, 0, moved);
        return true;
    }

    // drag is item
    const [moved] = drag.group.items.splice(drag.index, 1);

    if (target.kind === "group") {
        if (position === "inside" || position === "after" || position === "before") {
            // before/after a group while dragging an item → put inside that group
            if (position === "inside") {
                target.group.items.push(moved);
            } else if (position === "before") {
                target.group.items.unshift(moved);
            } else {
                target.group.items.push(moved);
            }
            return true;
        }
    }

    // target is item
    const after = findByUid(config, targetUid);
    if (!after || after.kind !== "item") {
        drag.group.items.splice(drag.index, 0, moved);
        return false;
    }
    const insertAt = position === "before" ? after.index : after.index + 1;
    after.group.items.splice(insertAt, 0, moved);
    return true;
}
