// Thin wrapper around the Wails runtime event API. Isolating it here means the
// rest of the frontend imports a stable path instead of the generated
// `wailsjs/runtime/runtime` module, and gives us one place to add teardown or
// logging if needed.
import { EventsOn as wailsEventsOn, EventsOff as wailsEventsOff } from "../../wailsjs/runtime/runtime";

/** Subscribe to a Wails event; returns an unsubscribe function. */
export function onEvent(name: string, cb: (...args: unknown[]) => void): () => void {
    return wailsEventsOn(name, cb);
}

/** Unsubscribe one or more previously registered events. */
export function offEvent(name: string, ...more: string[]): void {
    wailsEventsOff(name, ...more);
}
