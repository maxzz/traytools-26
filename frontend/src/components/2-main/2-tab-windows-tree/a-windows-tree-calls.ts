import { proxy, snapshot } from "valtio";
import { getDefaultStore } from "jotai";
import {
    highlightBus,
    windowTreeBus,
    isProcessGroupHandle,
    processGroupId,
    type WindowNode,
    type WindowInfo,
    type ProcessInfo,
    type RectInfo,
} from "@/bridge";
import { isBackendAvailable } from "@/wails/is-wails";
import { appSettings } from "@/store/1-ui-settings";
import { boundsNoticeFlashAtom, type BoundsNoticeKind } from "./s-windows-tree-state";

// Live, mutable window-tree data lives in Valtio (mirroring the trace manager
// split): the fetched tree snapshot and the detailed info for the currently
// selected window. Discrete UI state (selection, expanded ids, active props
// tab) lives in Jotai atoms — see tab-windowstree/a-windows-tree-atoms.ts.

interface WindowTreeState {
    root: WindowNode | null;
    count: number;
    loading: boolean;
    error: string | null;

    info: WindowInfo | null;
    processInfo: ProcessInfo | null;
    infoLoading: boolean;
    infoError: string | null;
}

export const windowTreeStore = proxy<WindowTreeState>({
    root: null,
    count: 0,
    loading: false,
    error: null,

    info: null,
    processInfo: null,
    infoLoading: false,
    infoError: null,
});

/** Ignores stale highlight results when the user clicks another row quickly. */
let highlightRequestId = 0;

/** Ignores overlapping getTree results (StrictMode remount / menu + page refresh). */
let treeRequestId = 0;

const BACKEND_WAIT_MS = 3000;
const BACKEND_POLL_MS = 50;
const LOAD_RETRY_DELAYS_MS = [0, 75, 150, 300, 600] as const;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBackend(timeoutMs = BACKEND_WAIT_MS): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (!isBackendAvailable()) {
        if (Date.now() >= deadline) {
            return false;
        }
        await sleep(BACKEND_POLL_MS);
    }
    return true;
}

function isTransientTreeError(error: string): boolean {
    const msg = error.toLowerCase();
    return msg.includes("backend is not available")
        || msg.includes("not available")
        || msg.includes("cannot read")
        || msg.includes("undefined");
}

export async function refreshWindowTree(): Promise<void> {
    const requestId = ++treeRequestId;
    windowTreeStore.loading = true;
    windowTreeStore.error = null;
    try {
        const tree = await windowTreeBus.getTree();
        if (requestId !== treeRequestId) {
            return;
        }
        windowTreeStore.root = tree?.root ?? null;
        windowTreeStore.count = tree?.count ?? 0;
    } catch (e) {
        if (requestId !== treeRequestId) {
            return;
        }
        windowTreeStore.error = String(e);
        // Keep any previously successful tree so a late/failed refresh cannot
        // blank the UI after a good result.
        if (windowTreeStore.root === null) {
            windowTreeStore.count = 0;
        }
    } finally {
        if (requestId === treeRequestId) {
            windowTreeStore.loading = false;
        }
    }
}

/**
 * Initial tab load: wait for Wails bindings, then retry transient failures.
 * No-ops when a tree is already present.
 */
export async function ensureWindowTreeLoaded(): Promise<void> {
    if (windowTreeStore.root !== null) {
        return;
    }

    windowTreeStore.loading = true;
    windowTreeStore.error = null;

    const ready = await waitForBackend();
    if (!ready) {
        windowTreeStore.error = "Backend is not available.";
        windowTreeStore.loading = false;
        return;
    }

    for (let i = 0; i < LOAD_RETRY_DELAYS_MS.length; i++) {
        const delayMs = LOAD_RETRY_DELAYS_MS[i];
        if (delayMs > 0) {
            await sleep(delayMs);
        }
        if (windowTreeStore.root !== null) {
            return;
        }

        await refreshWindowTree();
        if (windowTreeStore.root !== null) {
            return;
        }
        if (windowTreeStore.error && !isTransientTreeError(windowTreeStore.error)) {
            return;
        }
    }
}

/** Load window or process details for the current tree selection. */
export async function loadSelectionInfo(handle: string | null): Promise<void> {
    if (!handle || handle === "root") {
        windowTreeStore.info = null;
        windowTreeStore.processInfo = null;
        windowTreeStore.infoError = null;
        return;
    }
    if (isProcessGroupHandle(handle)) {
        const pid = processGroupId(handle);
        if (pid == null) {
            windowTreeStore.info = null;
            windowTreeStore.processInfo = null;
            windowTreeStore.infoError = null;
            return;
        }
        await loadProcessInfo(pid);
        return;
    }
    await loadWindowInfo(handle);
}

export async function loadWindowInfo(handle: string | null): Promise<void> {
    if (!handle || handle === "root" || isProcessGroupHandle(handle)) {
        windowTreeStore.info = null;
        windowTreeStore.processInfo = null;
        windowTreeStore.infoError = null;
        return;
    }
    windowTreeStore.infoLoading = true;
    windowTreeStore.infoError = null;
    windowTreeStore.processInfo = null;
    try {
        windowTreeStore.info = await windowTreeBus.getWindowInfo(handle);
    } catch (e) {
        windowTreeStore.infoError = String(e);
        windowTreeStore.info = null;
    } finally {
        windowTreeStore.infoLoading = false;
    }
}

export async function loadProcessInfo(processId: number): Promise<void> {
    windowTreeStore.infoLoading = true;
    windowTreeStore.infoError = null;
    windowTreeStore.info = null;
    try {
        windowTreeStore.processInfo = await windowTreeBus.getProcessInfo(processId);
    } catch (e) {
        windowTreeStore.infoError = String(e);
        windowTreeStore.processInfo = null;
    } finally {
        windowTreeStore.infoLoading = false;
    }
}

function triggerBoundsNotice(kind: BoundsNoticeKind, handle: string): void {
    if (!appSettings.windowHighlight.showBoundsNotice) {
        return;
    }
    const store = getDefaultStore();
    const prev = store.get(boundsNoticeFlashAtom);
    store.set(boundsNoticeFlashAtom, {
        token: prev.token + 1,
        kind,
        handle,
    });
}

function getSafeBlinkCount(): number {
    const raw = Number(appSettings.windowHighlight.blinkCount);
    if (!Number.isFinite(raw)) {
        return 3;
    }
    return Math.max(1, Math.min(10, Math.round(raw)));
}

function getSafeBorderWidth(): number {
    const raw = Number(appSettings.windowHighlight.borderWidth);
    if (!Number.isFinite(raw)) {
        return 2;
    }
    return Math.max(1, Math.min(20, Math.round(raw)));
}

function getSafeBorderColorRgb(): number {
    const hex = normalizeHexColor(appSettings.windowHighlight.borderColor);
    return Number.parseInt(hex.slice(1), 16);
}

function normalizeHexColor(color: string): string {
    const input = String(color ?? "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(input)) {
        return input.toLowerCase();
    }
    return "#ff0000";
}

function plainRect(rect: RectInfo): RectInfo {
    const left = Number(rect.left);
    const top = Number(rect.top);
    const right = Number(rect.right);
    const bottom = Number(rect.bottom);
    const width = Number(rect.width);
    const height = Number(rect.height);
    return {
        left: Number.isFinite(left) ? left : 0,
        top: Number.isFinite(top) ? top : 0,
        right: Number.isFinite(right) ? right : 0,
        bottom: Number.isFinite(bottom) ? bottom : 0,
        width: Number.isFinite(width) ? width : 0,
        height: Number.isFinite(height) ? height : 0,
    };
}

/** Empty only when the occupied area is zero (or edges inverted). */
function isBoundsEmpty(rect: RectInfo): boolean {
    // Prefer explicit width/height from WindowInfo; fall back to edges.
    const width = rect.width > 0 ? rect.width : rect.right - rect.left;
    const height = rect.height > 0 ? rect.height : rect.bottom - rect.top;
    return width <= 0 || height <= 0;
}

/** Refresh window info and outline its screen rectangle when auto-highlight is on. */
export async function maybeHighlightSelectedWindow(handle: string | null): Promise<void> {
    if (!handle || handle === "root" || isProcessGroupHandle(handle)) {
        return;
    }

    const requestId = ++highlightRequestId;

    await loadSelectionInfo(handle);
    if (requestId !== highlightRequestId) {
        return;
    }

    const infoSnap = windowTreeStore.info ? snapshot(windowTreeStore.info) : null;
    if (!infoSnap?.valid || infoSnap.handle !== handle) {
        return;
    }

    const rect = plainRect(infoSnap.rect as RectInfo);

    // Decide empty locally from the same numbers the Properties pane shows.
    // Do not round-trip to Go for this — a bad/empty payload was classifying
    // valid rects as empty.
    if (isBoundsEmpty(rect)) {
        triggerBoundsNotice("empty", handle);
        return;
    }

    let offscreen = false;
    try {
        const classification = await highlightBus.classifyBounds({
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
        });
        if (requestId !== highlightRequestId) {
            return;
        }
        offscreen = classification?.kind === "offscreen";
    } catch {
        if (requestId !== highlightRequestId) {
            return;
        }
    }

    if (offscreen) {
        triggerBoundsNotice("offscreen", handle);
    }

    await highlightBus.highlightRect(
        {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
        },
        {
            color: getSafeBorderColorRgb(),
            borderWidth: getSafeBorderWidth(),
            blinkCount: getSafeBlinkCount(),
        },
    );
}

export async function hideWindowHighlight(): Promise<void> {
    await highlightBus.hide();
}
