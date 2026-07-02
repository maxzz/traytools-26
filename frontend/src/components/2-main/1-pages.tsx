import { type ComponentType } from "react";
import { PageTraceManager } from "./tab-tracemanager/0-trace-manager-all";
import { PageTestTabA } from "./tab-tests/01-page-a/0-page-a-all";
import { PageTestTabB } from "./tab-tests/02-page-b/0-page-b-all";
import { PageDemos } from "./xyz-demos";

export const MAIN_PAGES = [
    { id: "demos", label: "Demos", Page: PageDemos },
    { id: "trace-manager", label: "Trace Manager", Page: PageTraceManager },
    { id: "test-a", label: "Test A", Page: PageTestTabA },
    { id: "test-b", label: "Test B", Page: PageTestTabB },
] as const satisfies readonly { id: string; label: string; Page: ComponentType }[];

export type MainTabId = (typeof MAIN_PAGES)[number]["id"];

export const DEFAULT_MAIN_TAB: MainTabId = "demos";

export function getValidMainTab(tab: string | undefined): MainTabId {
    const match = MAIN_PAGES.find((page) => page.id === tab);
    return match?.id ?? DEFAULT_MAIN_TAB;
}
