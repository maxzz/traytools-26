import { type ComponentType } from "react";
import { PageTestTabA } from "./tab-tests/01-page-a/0-page-a-all";
import { PageTestTabB } from "./tab-tests/02-page-b/0-page-b-all";
import { PageWelcome } from "./tab-welcome/0-welcome-all";
import { PageDemos } from "./xyz-demos";
import { PageTraceManager } from "./tab-tracemanager/0-trace-manager-all";
import { PageWindowsTree } from "./tab-windowstree/0-windows-tree-all";

export const MAIN_PAGES = [
    { id: "welcome", label: "Welcome Screen", Page: PageWelcome },
    { id: "trace", label: "Trace Manager", Page: PageTraceManager },
    { id: "windows-tree", label: "Windows Tree", Page: PageWindowsTree },
    { id: "demos", label: "Demos", Page: PageDemos },
    { id: "test-a", label: "Test A", Page: PageTestTabA },
    { id: "test-b", label: "Test B", Page: PageTestTabB },
] as const satisfies readonly { id: string; label: string; Page: ComponentType }[];

export type MainTabId = (typeof MAIN_PAGES)[number]["id"];

export const VIEW_MENU_ITEMS = MAIN_PAGES.slice(0, 3);

export const DEFAULT_MAIN_TAB: MainTabId = "welcome";

export function getValidMainTab(tab: string | undefined): MainTabId {
    const normalizedTab = tab === "demos" ? "welcome" : tab;
    const match = MAIN_PAGES.find((page) => page.id === normalizedTab);
    return match?.id ?? DEFAULT_MAIN_TAB;
}
