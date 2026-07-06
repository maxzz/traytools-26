import { proxy, subscribe } from "valtio";
import { toolsBus } from "@/bridge";

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

export interface ToolMenuItem {
    menuName: string;
    cmdLine?: string;
    cmdArgs?: string;
    cmdPlat?: CmdPlat;
    cmdWhat?: CmdWhat;
    hotKey?: string;
    // Run the command with elevated (administrator) privileges. Optional: when
    // absent the effective value defaults to true for registry actions and false
    // for everything else (see `effectiveRunElevated`). It is only written to
    // tools.json when it differs from that default.
    runElevated?: boolean;
    menuItems?: ToolMenuItem[];

    // Runtime-only stable identity used by the editor for selection and
    // drag-and-drop. It is stripped before the tree is written to tools.json.
    uid?: string;
}

export type NodeKind = "separator" | "submenu" | "item";

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

export interface ToolsConfig {
    menu: ToolMenuItem;
}

// ---------------------------------------------------------------------------
// Default config — must correspond to the entries shipped in tools/tools.json.

export const DEFAULT_TOOLS_CONFIG: ToolsConfig = {
    menu: {
        menuName: "Tools",
        menuItems: [
            {
                menuName: "Registry",
                menuItems: [
                    { menuName: "Regedit: DP Tracing", cmdLine: "HKLM\\SOFTWARE\\DigitalPersona\\Tracing", cmdPlat: "both", cmdWhat: "reg" },
                    { menuName: "Regedit: DP Tracing VirtualStore", cmdLine: "HKCU\\Software\\Classes\\VirtualStore\\MACHINE\\SOFTWARE\\Wow6432Node\\DigitalPersona\\Tracing", cmdPlat: "both", cmdWhat: "reg" },
                    { menuName: "Regedit: Run keys", cmdLine: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", cmdWhat: "reg" },
                ],
            },
            { menuName: "-" },
            {
                menuName: "Folders",
                menuItems: [
                    { menuName: "Open tools folder", cmdLine: "./", cmdWhat: "rel" },
                    { menuName: "Open %AppData%", cmdLine: "%AppData%", cmdWhat: "abs" },
                    { menuName: "Open %TEMP%", cmdLine: "%TEMP%", cmdWhat: "abs" },
                ],
            },
            { menuName: "-" },
            {
                menuName: "Utilities",
                menuItems: [
                    { menuName: "Notepad", cmdLine: "notepad.exe", cmdWhat: "abs" },
                    { menuName: "Calculator", cmdLine: "calc.exe", cmdWhat: "abs", hotKey: "F4" },
                    { menuName: "-" },
                    { menuName: "UAC Settings", cmdLine: "\"%windir%/system32/UserAccountControlSettings.exe\"", cmdWhat: "abs" },
                ],
            },
            {
                menuName: "Web links",
                menuItems: [
                    { menuName: "Sysinternals", cmdLine: "https://learn.microsoft.com/sysinternals/", cmdWhat: "abs" },
                    { menuName: "Process Explorer", cmdLine: "https://learn.microsoft.com/sysinternals/downloads/process-explorer", cmdWhat: "abs" },
                ],
            },
        ],
    },
};

// ---------------------------------------------------------------------------
// Persistence

const STORAGE_ID = "traytools-26__tools__v1.0";

export type ToolsSource = "default" | "file" | "storage";

export interface ToolsEditorStore {
    config: ToolsConfig;         // the current editable tree
    source: ToolsSource;         // where `config` came from on the last load
    path: string;                // file path reported by the backend (load/save target)
    dirty: boolean;              // has the tree changed since last load/save
    status: string;              // last user-facing status message
    error: string;               // last error, if any
    selectedUid: string | null;  // uid of the node shown in the properties panel
}

function cloneConfig(config: ToolsConfig): ToolsConfig {
    return structuredClone(config);
}

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

function readCache(): ToolsConfig | null {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            return JSON.parse(stored) as ToolsConfig;
        }
    } catch (e) {
        console.error("Failed to read cached tools config", e);
    }
    return null;
}

function writeCache(config: ToolsConfig) {
    try {
        localStorage.setItem(STORAGE_ID, JSON.stringify(config));
    } catch (e) {
        console.error("Failed to cache tools config", e);
    }
}

const initialConfig = readCache() ?? cloneConfig(DEFAULT_TOOLS_CONFIG);
ensureUids(initialConfig.menu);

export const toolsEditor = proxy<ToolsEditorStore>({
    config: initialConfig,
    source: readCache() ? "storage" : "default",
    path: "",
    dirty: false,
    status: "",
    error: "",
    selectedUid: null,
});

// Persist edits to localStorage so a loaded config survives a restart even when
// the file later goes missing.
subscribe(toolsEditor, () => {
    writeCache(toolsEditor.config);
});

// ---------------------------------------------------------------------------
// JSONC parsing (mirrors the backend jsonc stripper) so raw tools.json files
// with // and /* */ comments and trailing commas parse on the frontend too.

function stripJsonComments(src: string): string {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < src.length; i++) {
        const c = src[i];

        if (inString) {
            out += c;
            if (escaped) {
                escaped = false;
            } else if (c === "\\") {
                escaped = true;
            } else if (c === '"') {
                inString = false;
            }
            continue;
        }

        if (c === '"') {
            inString = true;
            out += c;
            continue;
        }

        if (c === "/" && src[i + 1] === "/") {
            while (i < src.length && src[i] !== "\n") {
                i++;
            }
            if (i < src.length) {
                out += "\n";
            }
            continue;
        }

        if (c === "/" && src[i + 1] === "*") {
            i += 2;
            while (i + 1 < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
                i++;
            }
            i++; // land on '/', loop's i++ moves past it
            continue;
        }

        out += c;
    }

    return removeTrailingCommas(out);
}

function removeTrailingCommas(src: string): string {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < src.length; i++) {
        const c = src[i];

        if (inString) {
            out += c;
            if (escaped) {
                escaped = false;
            } else if (c === "\\") {
                escaped = true;
            } else if (c === '"') {
                inString = false;
            }
            continue;
        }

        if (c === '"') {
            inString = true;
            out += c;
            continue;
        }

        if (c === ",") {
            let j = i + 1;
            while (j < src.length && /\s/.test(src[j])) {
                j++;
            }
            if (j < src.length && (src[j] === "}" || src[j] === "]")) {
                continue; // drop this comma
            }
        }

        out += c;
    }

    return out;
}

export function parseToolsJsonc(text: string): ToolsConfig {
    const parsed = JSON.parse(stripJsonComments(text)) as Partial<ToolsConfig>;
    if (!parsed || typeof parsed !== "object" || !parsed.menu) {
        throw new Error("tools.json must contain a top-level \"menu\" object");
    }
    return parsed as ToolsConfig;
}

// Serialize the current config to the on-disk JSON text (4-space indent).
//   - the runtime-only `uid` field is always dropped;
//   - `runElevated` is written only when it differs from the type-based default
//     (so e.g. an elevated registry action, which is the default, is not stored).
// A classic (non-arrow) function is used so `this` is the node being serialized.
export function serializeToolsConfig(config: ToolsConfig): string {
    return JSON.stringify(config, function (this: ToolMenuItem, key, value) {
        if (key === "uid") {
            return undefined;
        }
        if (key === "runElevated") {
            return value === defaultRunElevated(this) ? undefined : value;
        }
        return value;
    }, 4) + "\n";
}

// ---------------------------------------------------------------------------
// Mutations

export function setToolsConfig(config: ToolsConfig, source: ToolsSource, path = "") {
    ensureUids(config.menu);
    toolsEditor.config = config;
    toolsEditor.source = source;
    toolsEditor.path = path;
    toolsEditor.dirty = false;
    toolsEditor.error = "";

    // Keep the current selection if it still exists, otherwise clear it.
    if (toolsEditor.selectedUid && !findByUid(config.menu, toolsEditor.selectedUid)) {
        toolsEditor.selectedUid = null;
    }
}

export function markDirty() {
    toolsEditor.dirty = true;
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
    return !!uid && uid === toolsEditor.config.menu.uid;
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
    const root = toolsEditor.config.menu;
    const node = createNode(kind);

    const sel = toolsEditor.selectedUid ? findByUid(root, toolsEditor.selectedUid) : null;
    if (sel) {
        if (sel.node.menuItems) {
            sel.node.menuItems.push(node);
        } else {
            sel.siblings.splice(sel.index + 1, 0, node);
        }
    } else {
        (root.menuItems ??= []).push(node);
    }

    toolsEditor.selectedUid = node.uid!;
    markDirty();
}

export function removeNode(uid: string): void {
    if (isRootUid(uid)) {
        return; // the root "Tools" node cannot be deleted
    }
    const loc = findByUid(toolsEditor.config.menu, uid);
    if (!loc) {
        return;
    }
    loc.siblings.splice(loc.index, 1);
    if (toolsEditor.selectedUid === uid) {
        // Select the nearest remaining sibling, else the parent, else nothing.
        const next = loc.siblings[loc.index] ?? loc.siblings[loc.index - 1] ?? loc.parent;
        toolsEditor.selectedUid = next && next !== toolsEditor.config.menu ? next.uid ?? null : null;
    }
    markDirty();
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
    const root = toolsEditor.config.menu;

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
        markDirty();
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

    markDirty();
    return true;
}

export function resetToDefaults() {
    setToolsConfig(cloneConfig(DEFAULT_TOOLS_CONFIG), "default");
    toolsEditor.dirty = true;
    toolsEditor.status = "Reset to default tools";
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
                setToolsConfig(config, "file", raw.path);
                writeCache(config);
                toolsEditor.status = `Loaded from ${raw.path}`;
                return;
            } catch (e) {
                toolsEditor.error = `Invalid tools.json: ${String(e)}`;
                // fall through to cached/default below
            }
        }

        // No file on disk (or it was unparseable) — use the cached copy.
        const cached = readCache();
        if (cached) {
            setToolsConfig(cached, "storage", raw?.path ?? "");
            if (!toolsEditor.error) {
                toolsEditor.status = "File not found — using saved copy";
            }
            return;
        }

        setToolsConfig(cloneConfig(DEFAULT_TOOLS_CONFIG), "default", raw?.path ?? "");
        if (!toolsEditor.error) {
            toolsEditor.status = "No tools.json — showing defaults";
        }
    } catch (e) {
        toolsEditor.error = `Failed to load tools menu: ${String(e)}`;
    }
}

export async function saveToolsConfig(): Promise<void> {
    try {
        const text = serializeToolsConfig(toolsEditor.config);
        const res = await toolsBus.save(text);
        toolsEditor.path = res?.path ?? toolsEditor.path;
        toolsEditor.source = "file";
        toolsEditor.dirty = false;
        toolsEditor.error = "";
        toolsEditor.status = `Saved to ${toolsEditor.path}`;
        writeCache(toolsEditor.config);
    } catch (e) {
        toolsEditor.error = `Failed to save tools.json: ${String(e)}`;
    }
}
