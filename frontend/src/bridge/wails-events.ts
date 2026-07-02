import { EventsOn } from "../../wailsjs/runtime/runtime";

// Thin, typed wrapper over the Wails runtime event bus. Backend goroutines push
// data with runtime.EventsEmit; the returned function unsubscribes.
export function onWailsEvent<T = unknown>(eventName: string, callback: (data: T) => void): () => void {
    return EventsOn(eventName, (data: T) => callback(data));
}

// Event names emitted by the backend tracemanager package (see manager.go).
export const TRACE_EVENTS = {
    traceCall: "tracemanager:tracecall",
    streaming: "tracemanager:streaming",
} as const;
