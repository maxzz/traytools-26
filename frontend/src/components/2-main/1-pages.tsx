import { type ComponentType } from "react";
import { PageDemos } from "./xyz-demos";

export const MAIN_PAGES = [
    { id: "demos", label: "Demos", Page: PageDemos },
] as const satisfies readonly { id: string; label: string; Page: ComponentType }[];

export type MainTabId = (typeof MAIN_PAGES)[number]["id"];

export const DEFAULT_MAIN_TAB: MainTabId = "demos";

export function getValidMainTab(tab: string | undefined): MainTabId {
    const match = MAIN_PAGES.find((page) => page.id === tab);
    return match?.id ?? DEFAULT_MAIN_TAB;
}
