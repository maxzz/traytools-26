import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { type WindowNode } from "@/bridge";

// Discrete UI state for the Windows Tree tab. Kept in Jotai (per the task's
// state-management split) while the live tree data and selected-window details
// live in the Valtio store (store/4-windows-tree.ts).

export type PropsTab = "general" | "windowExtra";

// Currently selected window handle (string HWND), or null.
export const selectedHandleAtom = atom<string | null>(null);

// Free-text filter applied to the tree (matches class name or title).
export const treeFilterAtom = atom("");

// Show window handles inline in tree labels (WinSpy++ "Show HWND" option).
export const showHandlesAtom = atomWithStorage("wt.showHandles", true);

// Hide windows that are not currently visible (WS_VISIBLE off).
export const hideInvisibleAtom = atomWithStorage("wt.hideInvisible", false);

// Group top-level windows under synthetic process-name folders.
export const groupByProcessAtom = atomWithStorage("wt.groupByProcess", false);

// Flash notice when highlight hits empty or off-screen bounds.
// `handle` keeps the badge on the row that triggered it; `token` forces a
// fresh animation on every select/reselect.
export type BoundsNoticeKind = "empty" | "offscreen";

export type BoundsNoticeFlash = {
    token: number;
    kind: BoundsNoticeKind;
    handle: string | null;
};

export const boundsNoticeFlashAtom = atom<BoundsNoticeFlash>({
    token: 0,
    kind: "empty",
    handle: null,
});

// Active tab in the properties panel.
export const propsTabAtom = atomWithStorage<PropsTab>("wt.propsTab", "general");

// Filtered tree + expand ids, owned by WindowTreeToolbar (single filter pass).
export type FilteredTreeResult = {
    tree: WindowNode | null;
    expandIds: string[];
};

export const filteredTreeAtom = atom<FilteredTreeResult>({ tree: null, expandIds: [] });

// Bumped to remount TreeProvider so defaultExpandedIds re-apply (e.g. collapse to top level).
export const treeExpandRevisionAtom = atom(0);

// Non-root window count currently shown after filter / hide-invisible.
export const displayedCountAtom = atom(0);
