import { atom } from "jotai";
import { traceManagerStore } from "@/store/3-trace-manager";

// Jotai atoms for Trace Manager UI state. These cover the discrete,
// component-local pieces of UI state (selection, filters, layout) that don't
// need the mutable-proxy semantics Valtio gives the high-frequency trace-call
// buffers in store/3-trace-manager.ts.

// Which process trace window is currently shown in the trace-view pane. null
// means "no selection" -> the empty state.
export const selectedProcessIdAtom = atom<number | null>(null);

// Text filter applied to the trace lines in the current trace window.
export const traceFilterAtom = atom("");

// Whether to auto-scroll the trace view to the newest line.
export const autoScrollAtom = atom(true);

// Vertical split between the trace-windows list (top) and the trace view
// (bottom), as a percentage 0..100. Mirrors the legacy splitter pos_persent.
export const traceSplitPercentAtom = atom(35);

// Whether each category section is expanded. Keyed by section name.
export const expandedSectionsAtom = atom<Record<string, boolean>>({});

// Derived: the currently selected ProcessWindow, read from the Valtio store.
// Bridging Valtio -> Jotai here keeps a single source of truth for the windows
// while letting selection-driven components stay in Jotai-land.
export const selectedProcessAtom = atom((get) => {
    const id = get(selectedProcessIdAtom);
    if (id == null) return null;
    return traceManagerStore.processes[id] ?? null;
});
