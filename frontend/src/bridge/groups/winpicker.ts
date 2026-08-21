import { dispatch } from "../dispatch";
import { onWailsEvent, WINPICKER_EVENTS } from "../wails-events";
import { isBackendAvailable } from "@/wails/is-wails";

const GROUP = "winpicker";

const browserPickerListeners = new Set<(data: string) => void>();
let browserPickerCleanup: (() => void) | null = null;

function emitBrowserPicker(event: MouseEvent, released: boolean): void {
    const payload = JSON.stringify({
        released,
        processName: "browser-preview",
        screen: { x: event.screenX, y: event.screenY },
        client: { x: event.clientX, y: event.clientY },
    });
    browserPickerListeners.forEach((listener) => listener(payload));
}

function stopBrowserWindowPicker(): Promise<boolean> {
    if (browserPickerCleanup) {
        browserPickerCleanup();
        browserPickerCleanup = null;
        return Promise.resolve(true);
    }
    return Promise.resolve(false);
}

function startBrowserWindowPicker(): Promise<boolean> {
    void stopBrowserWindowPicker();

    const onMove = (event: MouseEvent) => emitBrowserPicker(event, false);
    const onUp = (event: MouseEvent) => {
        emitBrowserPicker(event, true);
        void stopBrowserWindowPicker();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    browserPickerCleanup = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        browserPickerCleanup = null;
    };
    return Promise.resolve(true);
}

/**
 * Window picker command group. Mirrors the "winpicker" group on the backend
 * bus. Move/up payloads arrive as JSON strings on WINPICKER_EVENTS.event.
 * In Vite-only browser preview, mouse tracking stays inside this window.
 */
export const windowPickerBus = {
    start: async (iconMode?: string): Promise<boolean> => {
        if (!isBackendAvailable()) {
            return startBrowserWindowPicker();
        }
        try {
            return await dispatch<boolean>(GROUP, "start", { iconMode: iconMode ?? "overlay" });
        } catch (e) {
            console.error("startWindowPicker failed", e);
            return false;
        }
    },
    stop: async (): Promise<boolean> => {
        if (!isBackendAvailable()) {
            return stopBrowserWindowPicker();
        }
        try {
            return await dispatch<boolean>(GROUP, "stop");
        } catch (e) {
            console.error("stopWindowPicker failed", e);
            return false;
        }
    },
    subscribe: (callback: (json: string) => void): (() => void) => {
        if (!isBackendAvailable()) {
            browserPickerListeners.add(callback);
            return () => {
                browserPickerListeners.delete(callback);
            };
        }
        try {
            return onWailsEvent(WINPICKER_EVENTS.event, (data: unknown) => {
                if (typeof data === "string") {
                    callback(data);
                    return;
                }
                try {
                    callback(JSON.stringify(data));
                } catch {
                    // ignore non-serializable payloads
                }
            });
        } catch (e) {
            console.error("onWindowPickerEvent failed", e);
            return () => undefined;
        }
    },
};
