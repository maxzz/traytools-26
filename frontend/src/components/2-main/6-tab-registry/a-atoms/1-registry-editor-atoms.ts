import { nextNumberedName } from "../../a-shared/numbered-name";
import { registryOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import {
    type AddRegKind,
    type RegConfig,
    type RegGroup,
    type RegItem,
    type RegNode,
    type RegSeparator,
    cloneGroup,
    cloneItem,
    cloneSeparator,
    containsGroup,
    createGroup,
    createItem,
    createSeparator,
    ensureNodeUids,
    findByUid,
    isRegGroup,
    isRegItem,
    isRegSeparator,
    itemLabel,
} from "./9-types-registry";
import { registryEditorStore, fileBaseNameNoExt, reportRegImport } from "./0-registry-local-storage";
import { parseRegFile } from "./7-reg-file-format";
import { normalizeGroup } from "./6-json-serialize-dirty";

export function isRootUid(uid: string | null | undefined): boolean {
    return !!uid && uid === registryEditorStore.rootUid;
}

export function getGroup(uid: string): RegGroup | null {
    const loc = findByUid(registryEditorStore.config, uid);
    return loc?.kind === "group" ? loc.group : null;
}

export function getItem(uid: string): RegItem | null {
    const loc = findByUid(registryEditorStore.config, uid);
    return loc?.kind === "item" ? loc.item : null;
}

export function addNode(kind: AddRegKind): void {
    const config = registryEditorStore.config;
    const selUid = registryEditorStore.selectedUid;

    if (kind === "group") {
        const group = createGroup();
        if (selUid && !isRootUid(selUid)) {
            const loc = findByUid(config, selUid);
            if (loc?.kind === "group") {
                // Nest inside the selected group.
                loc.group.items.push(group);
            } else if (loc?.kind === "item" || loc?.kind === "separator") {
                // Sibling after the selected leaf in the same parent list.
                loc.siblings.splice(loc.index + 1, 0, group);
            } else {
                config.groups.push(group);
            }
        } else {
            config.groups.push(group);
        }
        registryEditorStore.selectedUid = group.uid!;
        return;
    }

    if (kind === "separator") {
        const separator = createSeparator();
        placeLeafNode(config, selUid, separator);
        registryEditorStore.selectedUid = separator.uid!;
        return;
    }

    // Add registry item
    const item = createItem();
    if (selUid && !isRootUid(selUid)) {
        const loc = findByUid(config, selUid);
        if (loc?.kind === "group") {
            loc.group.items.push(item);
        } else if (loc?.kind === "item") {
            // Start from the selected item's key so adding sibling values is quick.
            item.hive = loc.item.hive;
            item.keyPath = loc.item.keyPath;
            item.view = loc.item.view;
            loc.siblings.splice(loc.index + 1, 0, item);
        } else if (loc?.kind === "separator") {
            loc.siblings.splice(loc.index + 1, 0, item);
        } else {
            ensureGroupThenPush(config, item);
        }
    } else {
        ensureGroupThenPush(config, item);
    }
    registryEditorStore.selectedUid = item.uid!;
}

/** Place a leaf (item/separator) inside the selection, or under the last root group. */
function placeLeafNode(config: RegConfig, selUid: string | null, node: RegItem | RegSeparator): void {
    if (selUid && !isRootUid(selUid)) {
        const loc = findByUid(config, selUid);
        if (loc?.kind === "group") {
            loc.group.items.push(node);
            return;
        }
        if (loc?.kind === "item" || loc?.kind === "separator") {
            loc.siblings.splice(loc.index + 1, 0, node);
            return;
        }
    }
    ensureGroupThenPush(config, node);
}

function ensureGroupThenPush(config: RegConfig, node: RegItem | RegSeparator): void {
    if (config.groups.length === 0) {
        const group = createGroup();
        group.items = [node];
        config.groups.push(group);
        return;
    }
    config.groups[config.groups.length - 1].items.push(node);
}

export function removeNode(uid: string): void {
    if (isRootUid(uid)) {
        return;
    }
    const loc = findByUid(registryEditorStore.config, uid);
    if (!loc) {
        return;
    }

    loc.siblings.splice(loc.index, 1);
    if (registryEditorStore.selectedUid !== uid) {
        return;
    }

    const next = loc.siblings[loc.index] ?? loc.siblings[loc.index - 1];
    if (next) {
        registryEditorStore.selectedUid = next.uid ?? null;
        return;
    }
    if (loc.kind === "group") {
        registryEditorStore.selectedUid = loc.parent?.uid ?? registryEditorStore.rootUid;
        return;
    }
    // item or separator — select the parent group
    registryEditorStore.selectedUid = loc.group.uid ?? registryEditorStore.rootUid;
}

export type DropPosition = "before" | "after" | "inside";

export function moveNode(dragUid: string, targetUid: string, position: DropPosition): boolean {
    if (dragUid === targetUid || isRootUid(dragUid)) {
        return false;
    }

    const config = registryEditorStore.config;
    const drag = findByUid(config, dragUid);
    if (!drag) {
        return false;
    }

    // Dropping on root: groups append at root; leaves need a group.
    if (isRootUid(targetUid)) {
        if (drag.kind === "group") {
            if (drag.parent) {
                // Nested group → promote to root.
                const [moved] = drag.siblings.splice(drag.index, 1) as RegGroup[];
                config.groups.push(moved);
            } else {
                const [moved] = config.groups.splice(drag.index, 1);
                config.groups.push(moved);
            }
            return true;
        }
        const [moved] = drag.siblings.splice(drag.index, 1);
        if (!isRegItem(moved) && !isRegSeparator(moved)) {
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
        if ((target.kind === "item" || target.kind === "separator") && containsGroup(drag.group, target.group)) {
            return false;
        }

        const [moved] = drag.siblings.splice(drag.index, 1);
        if (!isRegGroup(moved)) {
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

        // target is item/separator — place as sibling in the same list.
        const after = findByUid(config, targetUid);
        if (!after || (after.kind !== "item" && after.kind !== "separator")) {
            drag.siblings.splice(drag.index, 0, moved);
            return false;
        }
        const insertAt = position === "after" ? after.index + 1 : after.index;
        after.siblings.splice(insertAt, 0, moved);
        return true;
    }

    // drag is item or separator (leaf)
    const [moved] = drag.siblings.splice(drag.index, 1);
    if (!isRegItem(moved) && !isRegSeparator(moved)) {
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
    if (!after || (after.kind !== "item" && after.kind !== "separator")) {
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

    const config = registryEditorStore.config;
    const drag = findByUid(config, dragUid);
    if (!drag) {
        return false;
    }

    if (isRootUid(targetUid)) {
        if (drag.kind === "group") {
            const cloned = cloneGroup(drag.group);
            uniquifyGroupName(cloned, config.groups);
            config.groups.push(cloned);
            registryEditorStore.selectedUid = cloned.uid!;
            return true;
        }
        if (drag.kind === "separator") {
            const cloned = cloneSeparator(drag.separator);
            ensureGroupThenPush(config, cloned);
            registryEditorStore.selectedUid = cloned.uid!;
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
        registryEditorStore.selectedUid = cloned.uid!;
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
            registryEditorStore.selectedUid = cloned.uid!;
            return true;
        }
        uniquifyGroupName(cloned, target.siblings);
        const insertAt = position === "after" ? target.index + 1 : target.index;
        target.siblings.splice(insertAt, 0, cloned);
        registryEditorStore.selectedUid = cloned.uid!;
        return true;
    }

    if (drag.kind === "separator") {
        const cloned = cloneSeparator(drag.separator);
        if (target.kind === "group") {
            if (position === "before") {
                target.group.items.unshift(cloned);
            } else {
                target.group.items.push(cloned);
            }
            registryEditorStore.selectedUid = cloned.uid!;
            return true;
        }
        const insertAt = position === "before" ? target.index : target.index + 1;
        target.siblings.splice(insertAt, 0, cloned);
        registryEditorStore.selectedUid = cloned.uid!;
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
        registryEditorStore.selectedUid = cloned.uid!;
        return true;
    }

    uniquifyItemName(cloned, target.siblings);
    const insertAt = position === "before" ? target.index : target.index + 1;
    target.siblings.splice(insertAt, 0, cloned);
    registryEditorStore.selectedUid = cloned.uid!;
    return true;
}

function uniquifyGroupName(group: RegGroup, siblings: RegNode[]): void {
    const names = siblings.filter(isRegGroup).map((g) => g.name);
    group.name = nextNumberedName(group.name || "New Group", names);
}

function uniquifyItemName(item: RegItem, siblings: RegNode[]): void {
    const names = siblings.filter(isRegItem).map(itemLabel);
    item.name = nextNumberedName(itemLabel(item), names);
}

/**
 * Add OS-dropped .reg / .json files to the tree. Each file becomes its own new
 * top-level group named after the file, holding every value the file declares —
 * the drop target only decides where the highlight appeared, not where the
 * group lands.
 */
export async function addDroppedRegistryFiles(paths: string[]): Promise<void> {
    const usable = paths.map((p) => p.trim()).filter(Boolean);
    for (const path of usable) {
        await importRegistryFileAsGroup(path);
    }
}

/**
 * Import a .reg or .json file (native dialog) as a new group. Unlike the JSON
 * config import this adds to the tree instead of replacing it, since such a
 * file describes a set of values rather than a whole editor configuration.
 */
export async function RegistryImportFileAsGroup(): Promise<void> {
    try {
        const pick = await registryOpsBus.importPath("reg");
        if (pick.canceled || !pick.path) {
            return;
        }
        await importRegistryFileAsGroup(pick.path);
    } catch (e) {
        const msg = `Failed to import: ${String(e)}`;
        registryEditorStore.error = msg;
        notice.error(msg);
    }
}

async function importRegistryFileAsGroup(path: string): Promise<void> {
    try {
        const { content } = await registryOpsBus.readTextFile(path);
        const parsed = groupFromFileContent(content, fileBaseNameNoExt(path));
        if (!parsed) {
            notice.warning(`Not a registry or JSON file:<br/>${path}`);
            return;
        }
        if (!parsed.group.items.length) {
            notice.warning(`No registry values found in<br/>${path}`);
            return;
        }

        uniquifyGroupName(parsed.group, registryEditorStore.config.groups);
        registryEditorStore.config.groups.push(parsed.group);
        registryEditorStore.selectedUid = parsed.group.uid ?? registryEditorStore.selectedUid;
        registryEditorStore.error = "";
        reportRegImport(countItems(parsed.group), parsed.warnings, path);
    } catch (e) {
        notice.error(`Failed to import ${path}:<br/>${String(e)}`);
    }
}

function countItems(group: RegGroup): number {
    let n = 0;
    for (const node of group.items ?? []) {
        if (isRegGroup(node)) {
            n += countItems(node);
        } else if (isRegItem(node)) {
            n += 1;
        }
    }
    return n;
}

/**
 * Build a group from dropped file text. The format is decided by content, not
 * by extension, so a .txt holding a registry export still works.
 */
function groupFromFileContent(content: string, groupName: string): { group: RegGroup; warnings: string[]; } | null {
    const head = content.trimStart();

    if (/^(Windows Registry Editor Version|REGEDIT4)/i.test(head)) {
        return parseRegFile(content, groupName);
    }

    if (head.startsWith("{") || head.startsWith("[")) {
        return { group: groupFromJson(content, groupName), warnings: [] };
    }

    // No recognizable header: try .reg anyway, since a fragment without the
    // version line is still a common hand-written form.
    const parsed = parseRegFile(content, groupName);
    return parsed.group.items.length ? parsed : null;
}

/**
 * A dropped JSON file may be a whole config ({ groups: [...] }), a bare group,
 * or an array of items. All three collapse into one group.
 */
function groupFromJson(content: string, groupName: string): RegGroup {
    const parsed = JSON.parse(content) as unknown;
    const group = createGroup([]);
    group.name = groupName || "Imported";

    if (Array.isArray(parsed)) {
        group.items = normalizeGroup({ name: group.name, items: parsed }).items;
    } else {
        const obj = parsed as { groups?: unknown; items?: unknown; };
        if (Array.isArray(obj.groups)) {
            group.items = obj.groups.map((g) => normalizeGroup(g));
        } else if (Array.isArray(obj.items)) {
            group.items = normalizeGroup(obj).items;
        } else {
            throw new Error("Expected { groups: [...] }, { items: [...] }, or an array of items");
        }
    }

    // Nodes parsed from JSON carry no runtime identity yet.
    ensureNodeUids(group.items);
    return group;
}
