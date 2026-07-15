import { EventsOn } from "../../wailsjs/runtime/runtime";

/**
 * Thin, typed wrapper over the Wails runtime event bus. 
 * Backend goroutines push data with runtime.EventsEmit; the returned function unsubscribes.
 */
export function onWailsEvent<T = unknown>(eventName: string, callback: (data: T) => void): () => void {
    return EventsOn(eventName, (data: T) => callback(data));
}

/**
 * Event names emitted by the backend tracemanager package (see manager.go).
 * 
 * - traceCall is emitted when a trace call is made;
 * - streaming is emitted when the trace stream is started or stopped.
 */
export const TRACE_EVENTS = {
    traceCall: "tracemanager:tracecall",
    streaming: "tracemanager:streaming",
} as const;

/** Event names emitted by backend/hotkey_bindings.go for system-wide shortcuts. */
export const HOTKEY_EVENTS = {
    unloadHook: "hotkey:unloadHook",
} as const;
