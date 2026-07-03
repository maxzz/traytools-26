import { type ComponentType } from "react";
import { Page_XYZdemos } from "../2-main/xyz-demos";
import { PageTestTabA } from "../2-main/xyz-demos/01-page-a/0-page-a-all";
import { PageTestTabB } from "../2-main/xyz-demos/02-page-b/0-page-b-all";
import { PageWelcome } from "../2-main/8-tab-welcome/0-all-welcome";
import { Page_TraceBits } from "../2-main/2-tab-trace-bits/0-all-trace-bits";
import { Page_WindowsTree } from "../2-main/1-tab-windows-tree/0-all-windows-tree";
import { Page_ToolsMenuEditor } from "../2-main/3-tab-tools-menu-editor/0-all-tools-menu-editor";

export const MAIN_PAGES = [
    { id: "welcome", label: "Welcome Screen", Page: PageWelcome },
    { id: "trace-bits", label: "Trace Manager", Page: Page_TraceBits },
    { id: "windows-tree", label: "Windows Tree", Page: Page_WindowsTree },
    { id: "tools-menu-editor", label: "Tools Menu Editor", Page: Page_ToolsMenuEditor },
    { id: "demos", label: "Demos", Page: Page_XYZdemos },
    // { id: "test-a", label: "Test A", Page: PageTestTabA },
    // { id: "test-b", label: "Test B", Page: PageTestTabB },
] as const satisfies readonly { id: string; label: string; Page: ComponentType }[];

export type MainTabId = (typeof MAIN_PAGES)[number]["id"];

export const VIEW_MENU_ITEMS = MAIN_PAGES.slice(0, 4);

export const DEFAULT_MAIN_TAB: MainTabId = "welcome";

export function getValidMainTab(tab: string | undefined): MainTabId {
    const match = MAIN_PAGES.find((page) => page.id === tab);
    return match?.id ?? DEFAULT_MAIN_TAB;
}
