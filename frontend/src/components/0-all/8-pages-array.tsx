import { type ComponentType } from "react";
import { Page_XYZdemos } from "../2-main/xyz-demos";
import { PageTestTabA } from "../2-main/xyz-demos/01-page-a/0-page-a-all";
import { PageTestTabB } from "../2-main/xyz-demos/02-page-b/0-page-b-all";
import { PageWelcome } from "../2-main/8-tab-welcome/0-all-welcome";
import { Page_TraceBits } from "../2-main/2-tab-trace-bits/0-all-trace-bits";
import { Page_WindowsTree } from "../2-main/1-tab-windows-tree/0-all-windows-page";
import { Page_ToolsMenuEditor } from "../2-main/3-tab-tools-menu-editor/0-editor/0-all-editor";
import { Page_ActiveMonitor } from "../2-main/4-tab-active-monitor/0-all-active-monitor";
import { Page_CopyOperations } from "../2-main/5-tab-copy-operations/0-editor/0-all-editor";

// Pages definitions.

export const MAIN_PAGES = [
    { id: "welcome", label: "Welcome", Page: PageWelcome },
    { id: "trace-bits", label: "Trace Bits", Page: Page_TraceBits },
    { id: "windows-tree", label: "Windows", Page: Page_WindowsTree },
    { id: "active-monitor", label: "Active Monitor", Page: Page_ActiveMonitor },
    { id: "tools-menu-editor", label: "Tools Menu Editor", Page: Page_ToolsMenuEditor },
    { id: "copy-operations", label: "Copy Operations", Page: Page_CopyOperations },
    { id: "demos", label: "Demos", Page: Page_XYZdemos },
    // { id: "test-a", label: "Test A", Page: PageTestTabA },
    // { id: "test-b", label: "Test B", Page: PageTestTabB },
] as const satisfies readonly { id: string; label: string; Page: ComponentType; }[];

export type MainTabId = (typeof MAIN_PAGES)[number]["id"];

// Top menu view pages.

const ID_FOR_QUICKTABS: MainTabId[] = ["welcome", "windows-tree", "tools-menu-editor", "copy-operations"];

export const TOPMENU_VIEW_PAGES = MAIN_PAGES.filter((page) => page.id !== "demos");
export const QUICKTABS_VIEW_PAGES = MAIN_PAGES.filter((page) => ID_FOR_QUICKTABS.includes(page.id));

// Validated access to MainTabId and ComponentType.

export function getValidMainTab(tab: string | undefined): MainTabId {
    const match = MAIN_PAGES.find((page) => page.id === tab);
    const rv: MainTabId = match?.id ?? "welcome";
    return rv;
}

export function getValidTabComponent(tab: string | undefined): ComponentType {
    const match = MAIN_PAGES.find((page) => page.id === tab);
    const rv: ComponentType = match?.Page ?? MAIN_PAGES[0].Page;
    return rv;
}

// Title format: traytools: Welcome (🦈 elevated)

const APP_NAME = "traytools";

export function formatMainWindowTitle(mainTab: string | undefined, isElevated: boolean): string {
    const page = MAIN_PAGES.find((entry) => entry.id === getValidMainTab(mainTab));
    const mode = isElevated ? "🦈 elevated" : "🐋 non-elevated";
    return `${APP_NAME}: ${page?.label ?? "Welcome"} (${mode})`;
}
