import { dispatch } from "../dispatch";

const GROUP = "tools";

// A node in the render-ready Tools menu tree. Mirrors backend/toolsmenu.MenuView.
export interface ToolMenuNode {
    name: string;
    kind: "item" | "submenu" | "separator";
    id?: number;                 // present on "item" leaves; used by exec()
    what?: "rel" | "abs" | "reg"; // hint for icon selection
    hotKey?: string;
    hotKeyGlobal?: boolean;
    children?: ToolMenuNode[];
}

// Response of the "getMenu" command. Mirrors backend/toolsmenu.MenuResponse.
export interface ToolsMenuResponse {
    found: boolean;
    path: string;
    root?: ToolMenuNode;
    error?: string;
}

// Response of the "getRaw" command. Mirrors backend/toolsmenu.RawResponse.
// Carries the unparsed tools.json text for the editor page.
export interface ToolsRawResponse {
    found: boolean;
    path: string;
    content?: string;
    error?: string;
}

// Response of the "save" command. Mirrors backend/toolsmenu.SaveResponse.
export interface ToolsSaveResponse {
    path: string;
}

export type ToolHotkeyBinding = {
    id: number;
    name: string;
    hotKey: string;
    global: boolean;
};

export type ToolHotkeyConflict = {
    id?: number;
    name?: string;
    hotKey?: string;
    error: string;
};

// Response of the "syncHotkeys" command. Mirrors backend/toolsmenu.HotkeySyncResponse.
export interface ToolsHotkeySyncResponse {
    local: ToolHotkeyBinding[];
    global: ToolHotkeyBinding[];
    conflicts: ToolHotkeyConflict[];
}

/**
 * Tools menu command group. Mirrors the "tools" group on the backend bus.
 *
 * - getMenu returns the render-ready Tools menu tree;
 * - exec executes a tool by id;
 * - getRaw returns the unparsed tools.json text for editing;
 * - save writes tools.json to disk (creating it if missing);
 * - syncHotkeys registers global tool hotkeys and returns local bindings + conflicts.
 */
export const toolsBus = {
    getMenu: () => dispatch<ToolsMenuResponse>(GROUP, "getMenu"),
    exec: (id: number) => dispatch(GROUP, "exec", { id }),
    getRaw: () => dispatch<ToolsRawResponse>(GROUP, "getRaw"),
    save: (content: string) => dispatch<ToolsSaveResponse>(GROUP, "save", { content }),
    syncHotkeys: () => dispatch<ToolsHotkeySyncResponse>(GROUP, "syncHotkeys"),
};
