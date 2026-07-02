import { dispatch } from "../dispatch";

const GROUP = "tools";

// A node in the render-ready Tools menu tree. Mirrors backend/toolsmenu.MenuView.
export interface ToolMenuNode {
    name: string;
    kind: "item" | "submenu" | "separator";
    id?: number;                 // present on "item" leaves; used by exec()
    what?: "rel" | "abs" | "reg"; // hint for icon selection
    hotKey?: string;
    children?: ToolMenuNode[];
}

// Response of the "getMenu" command. Mirrors backend/toolsmenu.MenuResponse.
export interface ToolsMenuResponse {
    found: boolean;
    path: string;
    root?: ToolMenuNode;
    error?: string;
}

// Tools menu command group. Mirrors the "tools" group on the backend bus.
export const toolsBus = {
    getMenu: () => dispatch<ToolsMenuResponse>(GROUP, "getMenu"),
    exec: (id: number) => dispatch(GROUP, "exec", { id }),
};
