import { proxy } from "valtio";
import type { SectionDescription, TraceCall } from "@/bridge";

// High-frequency, mutable trace state lives in Valtio: trace calls can arrive
// many times per second, and Valtio lets components subscribe to just the slice
// they render. Discrete UI state (selection, filters, layout) lives in Jotai
// atoms instead — see tab-tracemanager/a-trace-manager-atoms.ts.

export interface TraceWindow {
    processId: number;
    name: string;        // display label for the process
    visible: boolean;    // mirrors the legacy per-process window show/hide checkbox
    calls: TraceCall[];
}

interface TraceManagerState {
    streaming: boolean;
    order: number[];                        // process ids in first-seen order
    windows: Record<number, TraceWindow>;   // per-process trace windows
    sections: SectionDescription[];         // debug categories (checkboxes)
    categoriesLoading: boolean;
    categoriesError: string | null;
    categoriesDirty: boolean;               // unsaved category edits
}

// Cap per-process history so a long session cannot grow without bound. Matches
// the spirit of a scrolling log view.
const MAX_CALLS_PER_WINDOW = 5000;

export const traceStore = proxy<TraceManagerState>({
    streaming: false,
    order: [],
    windows: {},
    sections: [],
    categoriesLoading: false,
    categoriesError: null,
    categoriesDirty: false,
});

function processLabel(call: TraceCall): string {
    return `PID ${call.processId} (0x${call.processId.toString(16).toUpperCase()})`;
}

// routeTraceCall groups an incoming call by process id, creating the per-process
// window on first sight. This is the Go/React analogue of
// manager_list_windows_t::handle_new_tracecall.
export function routeTraceCall(call: TraceCall): void {
    let win = traceStore.windows[call.processId];
    if (!win) {
        win = {
            processId: call.processId,
            name: processLabel(call),
            visible: true,
            calls: [],
        };
        traceStore.windows[call.processId] = win;
        traceStore.order.push(call.processId);
    }

    win.calls.push(call);
    if (win.calls.length > MAX_CALLS_PER_WINDOW) {
        win.calls.splice(0, win.calls.length - MAX_CALLS_PER_WINDOW);
    }
}

export function setWindowVisible(processId: number, visible: boolean): void {
    const win = traceStore.windows[processId];
    if (win) {
        win.visible = visible;
    }
}

export function clearWindow(processId: number): void {
    const win = traceStore.windows[processId];
    if (win) {
        win.calls = [];
    }
}

export function clearAllWindows(): void {
    traceStore.windows = {};
    traceStore.order = [];
}

export function setStreaming(streaming: boolean): void {
    traceStore.streaming = streaming;
}

export function setSections(sections: SectionDescription[]): void {
    traceStore.sections = sections;
    traceStore.categoriesDirty = false;
}

// toggleCategory flips one category bit and marks the set dirty so the Save
// button can reflect pending edits.
export function toggleCategory(sectionName: string, memId: number, active: boolean): void {
    const section = traceStore.sections.find((s) => s.sectionName === sectionName);
    if (!section) {
        return;
    }
    const item = section.items.find((i) => i.memId === memId);
    if (item) {
        item.active = active;
        traceStore.categoriesDirty = true;
    }
}
