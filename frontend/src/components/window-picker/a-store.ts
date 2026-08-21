import { proxy } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { windowPickerBus } from "@/bridge";
import { emptyWindowPickerState, normalizeDragIcon, normalizeOverlayCursor, windowPickerStartMode, type WindowPickerEvent, type WindowPickerReleasedHandler, type WindowPickerState } from "./9-types";

/** Live finder session. High-frequency cursor updates mutate this proxy. */
export const windowPickerStore = proxy<WindowPickerState>({ ...emptyWindowPickerState });

const releasedListeners = new Set<WindowPickerReleasedHandler>();

const hideCursorClass = "winpicker-hide-cursor";
const arrowCursorClass = "winpicker-arrow-cursor";

export function subscribeWindowPickerReleased(handler: WindowPickerReleasedHandler): () => void {
    releasedListeners.add(handler);
    return () => {
        releasedListeners.delete(handler);
    };
}

function applyDomCursor(active: boolean): void {
    document.documentElement.style.cursor = "";
    const overlay = active && windowPickerStore.iconMode === "overlay";
    const hide = overlay && !windowPickerStore.overlayShowCursor;
    const arrow = overlay && windowPickerStore.overlayShowCursor;
    document.documentElement.classList.toggle(hideCursorClass, hide);
    document.documentElement.classList.toggle(arrowCursorClass, arrow);
}

export function resetWindowPickerStore(): void {
    windowPickerStore.active = false;
    windowPickerStore.released = false;
    windowPickerStore.iconMode = "overlay";
    windowPickerStore.overlayShowCursor = false;
    windowPickerStore.processName = "";
    windowPickerStore.screen.x = 0;
    windowPickerStore.screen.y = 0;
    windowPickerStore.client.x = 0;
    windowPickerStore.client.y = 0;
    windowPickerStore.handle = "";
    windowPickerStore.rootHandle = "";
    windowPickerStore.title = "";
    applyDomCursor(false);
}

export function applyWindowPickerEvent(payload: WindowPickerEvent): void {
    const released = payload.released === true;
    windowPickerStore.active = !released;
    windowPickerStore.released = released;
    windowPickerStore.processName = payload.processName ?? "";
    windowPickerStore.screen.x = payload.screen?.x ?? 0;
    windowPickerStore.screen.y = payload.screen?.y ?? 0;
    windowPickerStore.client.x = payload.client?.x ?? 0;
    windowPickerStore.client.y = payload.client?.y ?? 0;
    windowPickerStore.handle = payload.handle ?? "";
    windowPickerStore.rootHandle = payload.rootHandle ?? "";
    windowPickerStore.title = payload.title ?? "";
    applyDomCursor(!released);

    if (released) {
        releasedListeners.forEach((handler) => handler(payload));
    }
}

export function applyWindowPickerEventJson(json: string | WindowPickerEvent): void {
    if (json && typeof json === "object") {
        applyWindowPickerEvent(json);
        return;
    }
    try {
        applyWindowPickerEvent(JSON.parse(json) as WindowPickerEvent);
    } catch (e) {
        console.error("Failed to parse window-picker event", e);
    }
}

/** Press-and-hold start. Icon hides immediately; Go (or the browser stub) tracks the mouse. */
export async function startWindowPicker(): Promise<boolean> {
    if (windowPickerStore.active) {
        return true;
    }
    windowPickerStore.active = true;
    windowPickerStore.released = false;
    windowPickerStore.iconMode = normalizeDragIcon(appSettings.winpicker_DragIcon);
    windowPickerStore.overlayShowCursor = windowPickerStore.iconMode === "overlay"
        && normalizeOverlayCursor(appSettings.winpicker_OverlayCursor) === "show";
    windowPickerStore.processName = "";
    applyDomCursor(true);

    const ok = await windowPickerBus.start(windowPickerStartMode(appSettings.winpicker_DragIcon, appSettings.winpicker_OverlayCursor));
    if (!ok) {
        resetWindowPickerStore();
    }
    return ok;
}

export async function stopWindowPicker(): Promise<void> {
    await windowPickerBus.stop();
    if (windowPickerStore.active) {
        resetWindowPickerStore();
    }
}
