import { proxy } from "valtio";
import { traceManagerBus, TRACE_MANAGER_EVENTS, type SectionDescription, type TraceCall } from "@/bridge";
import { onEvent } from "@/bridge/wails-events";

// Max trace lines kept per process window. The legacy listview grew unbounded;
// we cap to keep the webview responsive.
const MAX_CALLS_PER_PROCESS = 500;

export interface ProcessWindow {
    processId: number;
    processName: string;
    visible: boolean;
    calls: TraceCall[];
}

export interface TraceManagerState {
    // Per-process trace windows, keyed by process id. Mirrors the legacy
    // managerwindows_t::tracewindowpointers map (processID -> CTraceWindow).
    processes: Record<number, ProcessWindow>;

    // Whether the backend trace-call stream is running.
    streaming: boolean;

    // Trace categories (sections of checkboxes) loaded from the registry.
    categories: SectionDescription[];
    categoriesLoading: boolean;
    categoriesSaving: boolean;

    // Last user-facing error from a categories/registry action.
    error: string | undefined;
}

const initial: TraceManagerState = {
    processes: {},
    streaming: false,
    categories: [],
    categoriesLoading: false,
    categoriesSaving: false,
    error: undefined,
};

export const traceManagerStore = proxy<TraceManagerState>({ ...initial });

// ---- trace-call ingestion ---------------------------------------------------

// routeTraceCall is the equivalent of manager_list_windows_t::handle_new_tracecall:
// find-or-create the process window, then append the line. Mutating the proxy
// in place is what makes Valtio re-render only the affected window.
function routeTraceCall(call: TraceCall): void {
    let win = traceManagerStore.processes[call.processId];
    if (!win) {
        win = {
            processId: call.processId,
            processName: call.processName,
            visible: true,
            calls: [],
        };
        traceManagerStore.processes[call.processId] = win;
        applyPendingVisible(call.processId, win);
    }
    if (win.processName === "" && call.processName !== "") {
        win.processName = call.processName;
    }
    win.calls.push(call);
    if (win.calls.length > MAX_CALLS_PER_PROCESS) {
        // Drop the oldest 10% to amortize the shift cost.
        win.calls.splice(0, Math.floor(MAX_CALLS_PER_PROCESS * 0.1));
    }
}

// Subscribe to the backend trace-call event for the lifetime of the app.
onEvent(TRACE_MANAGER_EVENTS.traceCall, (...args) => {
    const call = args[0] as TraceCall | undefined;
    if (call) routeTraceCall(call);
});

// ---- actions ----------------------------------------------------------------

export const traceManagerActions = {
    clearProcess(processId: number): void {
        const win = traceManagerStore.processes[processId];
        if (win) win.calls.length = 0;
    },

    clearAll(): void {
        for (const id of Object.keys(traceManagerStore.processes)) {
            traceManagerStore.processes[Number(id)].calls.length = 0;
        }
    },

    setWindowVisible(processId: number, visible: boolean): void {
        const win = traceManagerStore.processes[processId];
        if (win) {
            win.visible = visible;
            persistVisible();
        }
    },

    async startStream(): Promise<void> {
        if (traceManagerStore.streaming) return;
        try {
            await traceManagerBus.startStream();
            traceManagerStore.streaming = true;
            traceManagerStore.error = undefined;
        } catch (e) {
            traceManagerStore.error = errMsg(e);
        }
    },

    async stopStream(): Promise<void> {
        if (!traceManagerStore.streaming) return;
        try {
            await traceManagerBus.stopStream();
            traceManagerStore.streaming = false;
        } catch (e) {
            traceManagerStore.streaming = false;
            traceManagerStore.error = errMsg(e);
        }
    },

    async loadCategories(): Promise<void> {
        traceManagerStore.categoriesLoading = true;
        traceManagerStore.error = undefined;
        try {
            const sections = await traceManagerBus.getCategories();
            traceManagerStore.categories = sections ?? [];
        } catch (e) {
            traceManagerStore.error = errMsg(e);
        } finally {
            traceManagerStore.categoriesLoading = false;
        }
    },

    async saveCategories(): Promise<void> {
        traceManagerStore.categoriesSaving = true;
        traceManagerStore.error = undefined;
        try {
            await traceManagerBus.saveCategories(traceManagerStore.categories);
        } catch (e) {
            traceManagerStore.error = errMsg(e);
        } finally {
            traceManagerStore.categoriesSaving = false;
        }
    },

    setCategoryActive(sectionIndex: number, memId: number, active: boolean): void {
        const section = traceManagerStore.categories[sectionIndex];
        if (!section) return;
        const desc = section.stringDescriptions.find((d) => d.memId === memId);
        if (desc) desc.active = active;
    },

    async openRegedit(key: string): Promise<void> {
        traceManagerStore.error = undefined;
        try {
            await traceManagerBus.openRegedit(key);
        } catch (e) {
            traceManagerStore.error = errMsg(e);
        }
    },

    async exportTrace(): Promise<void> {
        traceManagerStore.error = undefined;
        try {
            await traceManagerBus.exportTrace();
        } catch (e) {
            traceManagerStore.error = errMsg(e);
        }
    },

    async importTrace(): Promise<void> {
        traceManagerStore.error = undefined;
        try {
            await traceManagerBus.importTrace();
        } catch (e) {
            traceManagerStore.error = errMsg(e);
        }
    },

    clearError(): void {
        traceManagerStore.error = undefined;
    },
};

function errMsg(e: unknown): string {
    if (e instanceof Error) return e.message;
    return String(e);
}

// Persist the per-process visibility toggles across reloads so the user's
// choice of which trace windows are open survives a restart. Only the visible
// flags are persisted, not the live call buffers.
const VIS_KEY = "tm-tracemanager-26__visible-v1";

let pendingVisible: Record<number, boolean> = {};

try {
    const stored = localStorage.getItem(VIS_KEY);
    if (stored) {
        pendingVisible = JSON.parse(stored) as Record<number, boolean>;
    }
} catch {
    // ignore corrupt storage
}

// applyPendingVisible is called when a new process window is created, so a
// restored visibility flag is applied exactly once without re-running on
// every subsequent trace-call append.
function applyPendingVisible(processId: number, win: ProcessWindow): void {
    if (processId in pendingVisible) {
        win.visible = pendingVisible[processId]!;
    }
}

function persistVisible(): void {
    try {
        const out: Record<number, boolean> = {};
        for (const [id, win] of Object.entries(traceManagerStore.processes)) {
            out[Number(id)] = win.visible;
        }
        localStorage.setItem(VIS_KEY, JSON.stringify(out));
    } catch {
        // ignore storage errors
    }
}
