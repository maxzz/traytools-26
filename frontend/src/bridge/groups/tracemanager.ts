import { dispatch } from "../dispatch";
import type { SectionDescription, TraceCall } from "./tracemanager-types";

const GROUP = "tracemanager";

// Trace Manager group. Mirrors the "tracemanager" group registered on the
// backend bus (see backend/tracemanager/manager.go).
export const traceManagerBus = {
    getCategories: () => dispatch<SectionDescription[]>(GROUP, "getCategories"),
    saveCategories: (sections: SectionDescription[]) => dispatch(GROUP, "saveCategories", sections),
    openRegedit: (key: string) => dispatch(GROUP, "openRegedit", { key }),
    exportTrace: () => dispatch(GROUP, "exportTrace"),
    importTrace: () => dispatch(GROUP, "importTrace"),
    startStream: () => dispatch(GROUP, "startStream"),
    stopStream: () => dispatch(GROUP, "stopStream"),
};

// Event names emitted by the backend over Wails events.
export const TRACE_MANAGER_EVENTS = {
    traceCall: "tracemanager:tracecall",
} as const;

export type { SectionDescription, TraceCall };
