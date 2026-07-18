import { proxy } from "valtio";
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

function triggerBoundsNotice(kind: BoundsNoticeKind): void {
    if (!appSettings.windowHighlight.showBoundsNotice) {
        return;
    }
    const store = getDefaultStore();
    const prev = store.get(boundsNoticeFlashAtom);
    store.set(boundsNoticeFlashAtom, { token: prev.token + 1, kind });
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

function rectToBounds(rect: RectInfo) {
    return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
    };
}

/** Refresh window info and outline its screen rectangle when auto-highlight is on. */
export async function maybeHighlightSelectedWindow(handle: string | null): Promise<void> {
    if (!handle || handle === "root") {
        return;
    }

    await loadWindowInfo(handle);
    const info = windowTreeStore.info;
    if (!info?.valid) {
        return;
    }

    const classification = await highlightBus.classifyBounds(rectToBounds(info.rect));
    if (classification.kind === "empty") {
        triggerBoundsNotice("empty");
        return;
    }
    if (classification.kind === "offscreen") {
        triggerBoundsNotice("offscreen");
    }

    await highlightBus.highlightRect(
        rectToBounds(info.rect),
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
