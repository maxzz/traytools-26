import { proxy, subscribe } from "valtio";
import { toolsBus } from "@/bridge";
import { type NodeKind, type ToolMenuItem, type ToolsConfig } from "./9-types-menu";
import { type ToolsEditorStore, type ToolsSource, cloneConfig, STORAGE_ID } from "./1-menu-local-storage";
import { buildToolsFileText, extractRootComments, parseToolsJsonc, syncDirty } from "./7-json-support";
import { DEFAULT_TOOLS_CONFIG } from "./8-default-config";

// ---------------------------------------------------------------------------
// Stable runtime ids
//
// Each node gets a `uid` used only by the editor (selection + drag-and-drop).
// The uid is assigned lazily on load / create and stripped before saving.

let uidCounter = 0;

export function newUid(): string {
    uidCounter += 1;
    return `n${uidCounter}`;
}

function ensureUids(node: ToolMenuItem) {
    if (!node.uid) {
        node.uid = newUid();
    }
    node.menuItems?.forEach(ensureUids);
}

function readCache(): { config: ToolsConfig; rootComments: string; } | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as ToolsConfig | { config: ToolsConfig; rootComments?: string; };
            // Legacy v1.0 cache: plain ToolsConfig JSON.
            if (parsed && typeof parsed === "object" && "menu" in parsed) {
                return { config: parsed as ToolsConfig, rootComments: "" };
            }
            if (parsed && typeof parsed === "object" && "config" in parsed && parsed.config?.menu) {
                return { config: parsed.config, rootComments: parsed.rootComments ?? "" };
            }
        }
        // Fall back to the previous cache key once.
        const legacy = localStorage.getItem("traytools-26__tools__v1.0");
        if (legacy) {
            return { config: JSON.parse(legacy) as ToolsConfig, rootComments: "" };
        }
    } catch (e) {
        console.error("Failed to read cached tools config", e);
    }
    return null;
}

function writeCache(config: ToolsConfig) {
    try {
        localStorage.setItem(STORAGE_ID, JSON.stringify({
            config,
            rootComments: toolsEditorStore.rootComments,
        }));
    } catch (e) {
        console.error("Failed to cache tools config", e);
    }
}

const cached = readCache();
const initialConfig = cached?.config ?? cloneConfig(DEFAULT_TOOLS_CONFIG);
ensureUids(initialConfig.menu);
const initialRootComments = cached?.rootComments ?? "";

export const toolsEditorStore = proxy<ToolsEditorStore>({
    config: initialConfig,
    source: cached ? "storage" : "default",
    path: "",
    baseline: buildToolsFileText(initialConfig, initialRootComments),
    rootComments: initialRootComments,
    fileExists: false,
    dirty: true, // no on-disk file yet — unsaved until first save
    status: "",
    error: "",
    selectedUid: null,
});

// Persist edits to localStorage so a loaded config survives a restart even when
// the file later goes missing. Recompute dirty on every config change so edits
// that are undone back to the loaded state clear the unsaved indicator.
subscribe(toolsEditorStore, () => {
    writeCache(toolsEditorStore.config);
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

function newItem(): ToolMenuItem {
    return { uid: newUid(), menuName: "New Command", cmdLine: "", cmdWhat: "abs" };
}

function newSubmenu(): ToolMenuItem {
    return { uid: newUid(), menuName: "New Submenu", menuItems: [] };
}

function newSeparator(): ToolMenuItem {
    return { uid: newUid(), menuName: "-" };
}

export function createNode(kind: NodeKind): ToolMenuItem {
    return kind === "submenu" ? newSubmenu() : kind === "separator" ? newSeparator() : newItem();
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

// ---------------------------------------------------------------------------
// Load / save flow
//
// On load: prefer the on-disk file (and cache it). If the file is missing, fall
// back to the previously cached (localStorage) version, then to the defaults.

export async function loadToolsConfig(): Promise<void> {
    try {
        const raw = await toolsBus.getRaw();

        if (raw?.found && raw.content) {
            try {
                const config = parseToolsJsonc(raw.content);
                const rootComments = extractRootComments(raw.content);
                setToolsConfig(config, "file", raw.path, true, { rootComments });
                writeCache(config);
                toolsEditorStore.status = `Loaded from ${raw.path}`;
                return;
            } catch (e) {
                toolsEditorStore.error = `Invalid tools.json: ${String(e)}`;
                // fall through to cached/default below
            }
        }

        // No file on disk (or it was unparseable) — use the cached copy.
        const cached = readCache();
        if (cached) {
            setToolsConfig(cached.config, "storage", raw?.path ?? "", false, { rootComments: cached.rootComments });
            if (!toolsEditorStore.error) {
                toolsEditorStore.status = "File not found — using saved copy";
            }
            return;
        }

        setToolsConfig(cloneConfig(DEFAULT_TOOLS_CONFIG), "default", raw?.path ?? "", false);
        if (!toolsEditorStore.error) {
            toolsEditorStore.status = "No tools.json — showing defaults";
        }
    } catch (e) {
        toolsEditorStore.error = `Failed to load tools menu: ${String(e)}`;
    }
}

export async function saveToolsConfig(): Promise<void> {
    try {
        const text = buildToolsFileText(toolsEditorStore.config, toolsEditorStore.rootComments);
        const res = await toolsBus.save(text);
        toolsEditorStore.path = res?.path ?? toolsEditorStore.path;
        toolsEditorStore.source = "file";
        toolsEditorStore.baseline = text;
        toolsEditorStore.fileExists = true;
        toolsEditorStore.dirty = false;
        toolsEditorStore.error = "";
        toolsEditorStore.status = `Saved to ${toolsEditorStore.path}`;
        writeCache(toolsEditorStore.config);
    } catch (e) {
        toolsEditorStore.error = `Failed to save tools.json: ${String(e)}`;
    }
}
