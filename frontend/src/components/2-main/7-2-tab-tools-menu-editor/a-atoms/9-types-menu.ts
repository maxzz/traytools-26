// ---------------------------------------------------------------------------
// Editable model
//
// These types mirror backend/toolsmenu.MenuNode (and the on-disk tools.json
// format) exactly, so the editor round-trips cleanly to the file the backend
// reads. A node is one of:
//   - a separator  ({ menuName: "-" })
//   - a sub-menu    (has menuItems[])
//   - a command     (has cmdLine)

export type CmdWhat = "rel" | "abs" | "reg";
export type CmdPlat = "curr" | "32" | "64" | "both";

export type ToolMenuItem = {
    menuName: string;
    cmdLine?: string;
    cmdArgs?: string;
    cmdPlat?: CmdPlat;
    cmdWhat?: CmdWhat;
    hotKey?: string;
    // When true, the hotkey is registered system-wide (RegisterHotKey). When
    // absent or false it is application-local (only while this window is
    // focused). Defaults are not written to tools.json.
    hotKeyGlobal?: boolean;
    // Run the command with elevated (administrator) privileges. Optional: when
    // absent the effective value defaults to true for registry actions and false
    // for everything else (see `effectiveRunElevated`). It is only written to
    // tools.json when it differs from that default.
    runElevated?: boolean;
    // Optional note stored in tools.json; omitted when empty.
    comment?: string;
    menuItems?: ToolMenuItem[];

    // Runtime-only stable identity used by the editor for selection and
    // drag-and-drop. It is stripped before the tree is written to tools.json.
    uid?: string;
};

export type NodeKind = "separator" | "submenu" | "item";

// Kinds used when creating nodes from the editor menu. Command vs registry path
// is fixed at creation and cannot be changed afterwards.
export type AddNodeKind = "separator" | "submenu" | "command" | "registry";

export function isRegistryPath(node: Pick<ToolMenuItem, "cmdWhat">): boolean {
    return node.cmdWhat === "reg";
}

export function nodeKind(node: Pick<ToolMenuItem, "menuName" | "menuItems" | "cmdLine">): NodeKind {
    if (node.menuItems) {
        return "submenu";
    }
    if (node.menuName.trim() === "-" && !node.cmdLine) {
        return "separator";
    }
    return "item";
}

// The default "Run Elevated" value for a node when the attribute is absent:
// registry actions run elevated by default, all other actions do not.
export function defaultRunElevated(node: Pick<ToolMenuItem, "cmdWhat">): boolean {
    return node.cmdWhat === "reg";
}

// The effective "Run Elevated" value shown in the editor / used at runtime.
export function effectiveRunElevated(node: Pick<ToolMenuItem, "cmdWhat" | "runElevated">): boolean {
    return node.runElevated ?? defaultRunElevated(node);
}

export type ToolsConfig = {
    menu: ToolMenuItem;
};

// ---------------------------------------------------------------------------
// Editor state

export type ToolsSource = "default" | "file" | "storage";

export type ToolsEditorStore = {
    config: ToolsConfig;         // the current editable tree
    source: ToolsSource;         // where `config` came from on the last load
    path: string;                // file path reported by the backend (load/save target)
    baseline: string;            // full file text at last load/save (includes JSONC comments)
    rootComments: string;        // // and /* */ lines inside the root { } before "menu"
    fileExists: boolean;         // whether tools.json currently exists on disk
    dirty: boolean;              // true when the editor differs from the loaded/saved file
    status: string;              // last user-facing status message
    error: string;               // last error, if any
    selectedUid: string | null;  // uid of the node shown in the properties panel
};

// ---------------------------------------------------------------------------
// Stable runtime ids
//
// Each node gets a `uid` used only by the editor (selection + drag-and-drop).
// The uid is assigned lazily on load / create and stripped before saving.

let uidCounter = 0;

function newUid(): string {
    uidCounter += 1;
    return `n${uidCounter}`;
}

export function ensureUids(node: ToolMenuItem) {
    if (!node.uid) {
        node.uid = newUid();
    }
    node.menuItems?.forEach(ensureUids);
}

function newCommand(): ToolMenuItem {
    return { uid: newUid(), menuName: "New Command", cmdLine: "", cmdWhat: "abs" };
}

function newRegistryItem(): ToolMenuItem {
    return { uid: newUid(), menuName: "New Registry Path", cmdLine: "", cmdWhat: "reg" };
}

function newSubmenu(): ToolMenuItem {
    return { uid: newUid(), menuName: "New Submenu", menuItems: [] };
}

function newSeparator(): ToolMenuItem {
    return { uid: newUid(), menuName: "-" };
}

export function createNode(kind: AddNodeKind): ToolMenuItem {
    switch (kind) {
        case "submenu": return newSubmenu();
        case "separator": return newSeparator();
        case "registry": return newRegistryItem();
        case "command": return newCommand();
    }
}

// ---------------------------------------------------------------------------
// Tree navigation helpers

export type NodeLocation = {
    node: ToolMenuItem;        // the found node
    parent: ToolMenuItem;      // its parent (the root menu for top-level nodes)
    siblings: ToolMenuItem[];  // parent.menuItems (the array the node lives in)
    index: number;             // node's index within `siblings`
};

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

// ---------------------------------------------------------------------------
// Selection path (survives uid reassignment across elevation restarts)
//
// Runtime uids are regenerated when loading from tools.json, so selection must
// be persisted as a stable index path ([] = root, null = nothing selected).

export type ToolsSelectionPath = number[] | null;

export function selectionPathFromUid(root: ToolMenuItem, uid: string | null | undefined): ToolsSelectionPath {
    if (!uid) {
        return null;
    }
    if (uid === root.uid) {
        return [];
    }
    function walk(node: ToolMenuItem, path: number[]): number[] | null {
        const children = node.menuItems;
        if (!children) {
            return null;
        }
        for (let index = 0; index < children.length; index++) {
            const child = children[index];
            const next = [...path, index];
            if (child.uid === uid) {
                return next;
            }
            const found = walk(child, next);
            if (found) {
                return found;
            }
        }
        return null;
    }
    return walk(root, []);
}

export function uidFromSelectionPath(root: ToolMenuItem, path: ToolsSelectionPath | undefined): string | null {
    if (path == null) {
        return null;
    }
    if (path.length === 0) {
        return root.uid ?? null;
    }
    let node: ToolMenuItem = root;
    for (const index of path) {
        const children = node.menuItems;
        if (!children || index < 0 || index >= children.length) {
            return null;
        }
        node = children[index];
    }
    return node.uid ?? null;
}

export function parseToolsSelectionPath(value: unknown): ToolsSelectionPath | undefined {
    if (value === null) {
        return null;
    }
    if (!Array.isArray(value) || !value.every((n) => Number.isInteger(n) && n >= 0)) {
        return undefined;
    }
    return value as number[];
}
