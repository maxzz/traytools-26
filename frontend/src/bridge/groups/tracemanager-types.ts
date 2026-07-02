// Frontend mirror of backend/tracemanager/types.go. Kept in its own module so
// both the bridge and the UI/store can import the shapes without pulling the
// dispatch client.

export interface StringDescription {
    memId: number;
    active: boolean;
    description: string;
}

export interface SectionDescription {
    sectionName: string;
    stringDescriptions: StringDescription[];
}

export interface TraceCall {
    processId: number;
    processName: string;
    threadId: number;
    module: number;
    functionName: string;
    text: string;
    timestamp: number;
}
