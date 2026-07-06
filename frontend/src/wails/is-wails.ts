type BackendApp = {
    Dispatch: (group: string, command: string, payloadJSON: string) => Promise<string>;
    Greet: (name: string) => Promise<string>;
    RequestExit: () => Promise<void>;
    SetDevToolsState: (open: boolean) => Promise<void>;
    SetTrayIcon: (icon: number[]) => Promise<void>;
    ToggleDevTools: () => Promise<void>;
};

type WailsWindow = Window & {
    go?: {
        backend?: {
            App?: BackendApp;
        };
    };
    runtime?: unknown;
};

export function isBackendAvailable(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    return Boolean((window as WailsWindow).go?.backend?.App);
}

export function getBackendApp(): BackendApp | undefined {
    if (!isBackendAvailable()) {
        return undefined;
    }

    return (window as WailsWindow).go!.backend!.App!;
}
