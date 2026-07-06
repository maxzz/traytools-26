import { getBackendApp } from "./is-wails";

function requireBackendApp() {
    const app = getBackendApp();
    if (!app) {
        throw new Error("Backend is not available.");
    }
    return app;
}

export function backendDispatch(group: string, command: string, payloadJSON: string): Promise<string> {
    return requireBackendApp().Dispatch(group, command, payloadJSON);
}

export function toggleDevTools(): Promise<void> {
    return requireBackendApp().ToggleDevTools();
}
