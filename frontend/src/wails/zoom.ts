import { getBackendApp, isBackendAvailable } from "./is-wails";

const ZOOM_STEP = 0.5;
const ZOOM_STORAGE_KEY = "traytools-browser-zoom-level";

let currentZoomLevel = 0;
const zoomListeners = new Set<(level: number) => void>();

// Serialize Go zoom calls so rapid clicks stay ordered (apply + persist).
let zoomChain: Promise<unknown> = Promise.resolve();

function notifyZoomListeners(): void {
    zoomListeners.forEach((listener) => listener(currentZoomLevel));
}

function applyCssZoom(level: number): void {
    const factor = Math.pow(1.2, level);
    document.documentElement.style.zoom = factor === 1 ? "" : String(factor);
}

function readStoredZoomLevel(): number {
    try {
        const raw = localStorage.getItem(ZOOM_STORAGE_KEY);
        if (raw == null) {
            return 0;
        }
        const level = Number(raw);
        return Number.isFinite(level) ? level : 0;
    } catch {
        return 0;
    }
}

function persistBrowserZoomLevel(level: number): void {
    try {
        localStorage.setItem(ZOOM_STORAGE_KEY, String(level));
    } catch {
        // ignore quota / private-mode failures
    }
}

function applyZoom(level: number): number {
    currentZoomLevel = level;
    notifyZoomListeners();

    if (isBackendAvailable()) {
        const app = getBackendApp();
        if (app) {
            zoomChain = zoomChain.then(() => app.SetZoomLevel(level)).catch(() => undefined);
        }
    } else {
        applyCssZoom(level);
        persistBrowserZoomLevel(level);
    }

    return currentZoomLevel;
}

function handleZoom(action: "in" | "out" | "reset"): number {
    if (action === "in") {
        return applyZoom(currentZoomLevel + ZOOM_STEP);
    }
    if (action === "out") {
        return applyZoom(currentZoomLevel - ZOOM_STEP);
    }
    return applyZoom(0);
}

export function zoomAction(action: "in" | "out" | "reset"): number {
    return handleZoom(action);
}

export function getCurrentZoomLevel(): number {
    return currentZoomLevel;
}

export function onZoomChanged(callback: (level: number) => void): () => void {
    zoomListeners.add(callback);
    return () => {
        zoomListeners.delete(callback);
    };
}

/** Sync UI from persisted zoom (native factor is already applied at startup). */
export function restoreZoom(): void {
    if (isBackendAvailable()) {
        const app = getBackendApp();
        if (!app) {
            return;
        }
        app.GetZoomLevel()
            .then((level) => {
                if (!Number.isFinite(level)) {
                    return;
                }
                currentZoomLevel = level;
                notifyZoomListeners();
            })
            .catch(() => undefined);
        return;
    }

    currentZoomLevel = readStoredZoomLevel();
    applyCssZoom(currentZoomLevel);
    notifyZoomListeners();
}
