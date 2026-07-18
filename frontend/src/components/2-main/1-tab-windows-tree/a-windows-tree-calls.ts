import { proxy, snapshot } from "valtio";
import { getDefaultStore } from "jotai";
import { highlightBus, windowTreeBus, type WindowNode, type WindowInfo, type RectInfo } from "@/bridge";
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
    infoLoading: boolean;
    infoError: string | null;
}

export const windowTreeStore = proxy<WindowTreeState>({
    root: null,
    count: 0,
    loading: false,
    error: null,

    info: null,
    infoLoading: false,
    infoError: null,
});

/** Ignores stale highlight results when the user clicks another row quickly. */
let highlightRequestId = 0;

export async function refreshWindowTree(): Promise<void> {
    windowTreeStore.loading = true;
    windowTreeStore.error = null;
    try {
        const tree = await windowTreeBus.getTree();
        windowTreeStore.root = tree?.root ?? null;
        windowTreeStore.count = tree?.count ?? 0;
    } catch (e) {
        windowTreeStore.error = String(e);
        windowTreeStore.root = null;
        windowTreeStore.count = 0;
    } finally {
        windowTreeStore.loading = false;
    }
}

export async function loadWindowInfo(handle: string | null): Promise<void> {
    if (!handle || handle === "root") {
        windowTreeStore.info = null;
        windowTreeStore.infoError = null;
        return;
    }
    windowTreeStore.infoLoading = true;
    windowTreeStore.infoError = null;
    try {
        windowTreeStore.info = await windowTreeBus.getWindowInfo(handle);
    } catch (e) {
        windowTreeStore.infoError = String(e);
        windowTreeStore.info = null;
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
    if (!handle || handle === "root") {
        return;
    }

    const requestId = ++highlightRequestId;

    await loadWindowInfo(handle);
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
