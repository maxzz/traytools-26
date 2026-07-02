import { dispatch } from "../dispatch";

const GROUP = "tracemanager";

// Types mirror the JSON produced by backend/tracemanager (types.go).

export interface TraceCall {
    processId: number;
    threadId: number;
    module: number;
    function: string;
    text: string;       // color prefix already stripped by the backend
    colorIndex: number; // 0..15 palette index, or -1 for no highlight
    seq: number;
    timeMs: number;
}

export interface StringDescription {
    category: number;
    bit: number;
    description: string;
    active: boolean;
    memId: number;
}

export interface SectionDescription {
    sectionName: string;
    items: StringDescription[];
}

export type RegeditTarget = "user" | "tracing";

export interface TraceStatus {
    streaming: boolean;
}

// Trace manager command group. Mirrors the "tracemanager" group on the backend
// bus (manager.go).
export const traceManagerBus = {
    getCategories: () => dispatch<SectionDescription[]>(GROUP, "getCategories"),
    saveCategories: (sections: SectionDescription[]) => dispatch<SectionDescription[]>(GROUP, "saveCategories", { sections }),
    openRegedit: (target: RegeditTarget) => dispatch(GROUP, "openRegedit", { target }),
    exportTrace: () => dispatch(GROUP, "exportTrace"),
    importTrace: () => dispatch(GROUP, "importTrace"),
    startStream: (demo = true) => dispatch<TraceStatus>(GROUP, "startStream", { demo }),
    stopStream: () => dispatch<TraceStatus>(GROUP, "stopStream"),
    getStatus: () => dispatch<TraceStatus>(GROUP, "getStatus"),
};
