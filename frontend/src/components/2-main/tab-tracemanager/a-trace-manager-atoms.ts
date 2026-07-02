import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { type Layout } from "react-resizable-panels";

// Discrete UI state for the Trace Manager tab. Kept in Jotai (per the task's
// state-management split) while the live trace data and categories live in the
// Valtio store (store/3-trace-manager.ts). Preferences that should survive a
// reload use atomWithStorage.

// Currently selected process window (top list drives the bottom trace view).
export const selectedProcessAtom = atom<number | null>(null);

// Free-text filter applied to the selected window's trace lines.
export const traceFilterAtom = atom("");

// Persisted view preferences.
export const autoScrollAtom = atomWithStorage("tm.autoScroll", true);
export const showColorsAtom = atomWithStorage("tm.showColors", true);
export const streamOnMountAtom = atomWithStorage("tm.streamOnMount", false);

// Expanded category sections (accordion-like collapsibles).
export const expandedSectionsAtom = atomWithStorage<string[]>("tm.expandedSections", []);

// Resizable split layouts. Keys map to ResizablePanel ids.
export const mainLayoutAtom = atomWithStorage<Layout>("tm.layout.main", { panels: 68, categories: 32 });
export const leftLayoutAtom = atomWithStorage<Layout>("tm.layout.left", { list: 38, view: 62 });
