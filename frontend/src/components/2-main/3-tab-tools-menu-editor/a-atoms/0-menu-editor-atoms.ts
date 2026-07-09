import { subscribe } from "valtio";
import { type NodeKind, type ToolMenuItem, type ToolsConfig, ensureUids, createNode } from "./9-types-menu";
import { type ToolsSource, cloneConfig, toolsEditorStore } from "./1-menu-local-storage";
import { writeCache } from "./7-config-file";
import { buildToolsFileText, syncDirty } from "./7-json-support";
import { DEFAULT_TOOLS_CONFIG } from "./8-default-config";

// Persist edits to localStorage so a loaded config survives a restart even when
// the file later goes missing. Recompute dirty on every config change so edits
// that are undone back to the loaded state clear the unsaved indicator.
subscribe(toolsEditorStore, () => {
    writeCache(toolsEditorStore.config, toolsEditorStore.rootComments);
    syncDirty(toolsEditorStore);
});

// ---------------------------------------------------------------------------
// Mutations

// Record a freshly loaded (or saved) config as the baseline for dirty tracking.
export function setToolsConfig(
    config: ToolsConfig,
    source: ToolsSource,
    path = "",
    fileExists = source === "file",
    opts?: { rootComments?: string; },
) {
    ensureUids(config.menu);
    toolsEditorStore.rootComments = opts?.rootComments ?? "";
    toolsEditorStore.config = config;
    toolsEditorStore.source = source;
    toolsEditorStore.path = path;
    toolsEditorStore.fileExists = fileExists;
    toolsEditorStore.baseline = buildToolsFileText(config, toolsEditorStore.rootComments);
    toolsEditorStore.dirty = !fileExists;
    toolsEditorStore.error = "";

    // Keep the current selection if it still exists, otherwise clear it.
    if (toolsEditorStore.selectedUid && !findByUid(config.menu, toolsEditorStore.selectedUid)) {
        toolsEditorStore.selectedUid = null;
    }
}

// ---------------------------------------------------------------------------
// Tree navigation + mutation helpers (all keyed by the runtime `uid`).

export interface NodeLocation {
    node: ToolMenuItem;    // the found node
    parent: ToolMenuItem;  // its parent (the root menu for top-level nodes)
    siblings: ToolMenuItem[]; // parent.menuItems (the array the node lives in)
    index: number;         // node's index within `siblings`
}

export function findByUid(root: ToolMenuItem, uid: string): NodeLocation | null {
    const siblings = root.menuItems;
    if (!siblings) {
        return null;
    }
    for (let index = 0; index < siblings.length; index++) {
        const node = siblings[index];
        if (node.uid === uid) {
            return { node, parent: root, siblings, index };
        }
        const found = findByUid(node, uid);
        if (found) {
            return found;
        }
    }
    return null;
}

// True when `uid` is the (fixed, non-movable, non-deletable) root menu node.
export function isRootUid(uid: string | null | undefined): boolean {
    return !!uid && uid === toolsEditorStore.config.menu.uid;
}

// Look up a node by uid including the root menu itself (which findByUid, being
// descendant-only, never returns). Accepts any root so it also works on
// valtio snapshots.
export function getNode(root: ToolMenuItem, uid: string): ToolMenuItem | null {
    if (uid === root.uid) {
        return root;
    }
    return findByUid(root, uid)?.node ?? null;
}

// Add a node. If a node is currently selected, the new node is inserted as a
// sibling right after it (or as a child when the selection is a submenu).
// Otherwise it is appended to the root menu. The new node becomes selected.
export function addNode(kind: NodeKind): void {
    const root = toolsEditorStore.config.menu;
    const node = createNode(kind);

    const sel = toolsEditorStore.selectedUid ? findByUid(root, toolsEditorStore.selectedUid) : null;
    if (sel) {
        if (sel.node.menuItems) {
            sel.node.menuItems.push(node);
        } else {
            sel.siblings.splice(sel.index + 1, 0, node);
        }
    } else {
        (root.menuItems ??= []).push(node);
    }

    toolsEditorStore.selectedUid = node.uid!;
}

export function removeNode(uid: string): void {
    if (isRootUid(uid)) {
        return; // the root "Tools" node cannot be deleted
    }
    const loc = findByUid(toolsEditorStore.config.menu, uid);
    if (!loc) {
        return;
    }
    loc.siblings.splice(loc.index, 1);
    if (toolsEditorStore.selectedUid === uid) {
        // Select the nearest remaining sibling, else the parent, else nothing.
        const next = loc.siblings[loc.index] ?? loc.siblings[loc.index - 1] ?? loc.parent;
        toolsEditorStore.selectedUid = next && next !== toolsEditorStore.config.menu ? next.uid ?? null : null;
    }
}

// True when `maybeAncestor` is `node` or contains it somewhere below.
function containsNode(maybeAncestor: ToolMenuItem, node: ToolMenuItem): boolean {
    if (maybeAncestor === node) {
        return true;
    }
    return !!maybeAncestor.menuItems?.some((child) => containsNode(child, node));
}

export type DropPosition = "before" | "after" | "inside";

// Move `dragUid` relative to `targetUid`. Returns false when the move is not
// allowed (e.g. dropping a submenu into one of its own descendants).
export function moveNode(dragUid: string, targetUid: string, position: DropPosition): boolean {
    if (dragUid === targetUid) {
        return false;
    }
    const root = toolsEditorStore.config.menu;

    // The root cannot be moved.
    if (dragUid === root.uid) {
        return false;
    }

    const drag = findByUid(root, dragUid);
    if (!drag) {
        return false;
    }

    // Dropping onto the root can only mean "append inside the root menu".
    if (targetUid === root.uid) {
        drag.siblings.splice(drag.index, 1);
        (root.menuItems ??= []).push(drag.node);
        return true;
    }

    const target = findByUid(root, targetUid);
    if (!target) {
        return false;
    }
    // Cannot move a node into itself or its own subtree.
    if (containsNode(drag.node, target.node)) {
        return false;
    }

    // Detach the dragged node first (indices below are recomputed afterwards).
    drag.siblings.splice(drag.index, 1);

    if (position === "inside") {
        (target.node.menuItems ??= []).push(drag.node);
    } else {
        // Re-find the target because removing the drag node may have shifted it.
        const after = findByUid(root, targetUid);
        if (!after) {
            // Shouldn't happen; re-attach where it came from as a fallback.
            drag.siblings.splice(drag.index, 0, drag.node);
            return false;
        }
        const insertAt = position === "before" ? after.index : after.index + 1;
        after.siblings.splice(insertAt, 0, drag.node);
    }

    return true;
}

export function resetToDefaults() {
    const config = cloneConfig(DEFAULT_TOOLS_CONFIG);
    ensureUids(config.menu);
    toolsEditorStore.config = config;
    toolsEditorStore.rootComments = "";
    toolsEditorStore.source = "default";
    syncDirty(toolsEditorStore);
    toolsEditorStore.status = "Reset to default tools";
}
