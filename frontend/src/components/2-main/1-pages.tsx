import { type ComponentType } from "react";
import { PageTestTabA } from "./tab-tests/01-test-tab-a";
import { PageTestTabB } from "./tab-tests/02-test-tab-b";
import { PageDemos } from "./xyz-demos";

export const MAIN_PAGES = [
    { id: "demos", label: "Demos", Page: PageDemos },
    { id: "test-a", label: "Test A", Page: PageTestTabA },
    { id: "test-b", label: "Test B", Page: PageTestTabB },
] as const satisfies readonly { id: string; label: string; Page: ComponentType }[];

export type MainTabId = (typeof MAIN_PAGES)[number]["id"];

export const DEFAULT_MAIN_TAB: MainTabId = "demos";

export function getValidMainTab(tab: string | undefined): MainTabId {
    const match = MAIN_PAGES.find((page) => page.id === tab);
    return match?.id ?? DEFAULT_MAIN_TAB;
}
