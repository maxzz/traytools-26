import { proxy } from "valtio";
import { getDefaultStore } from "jotai";
import { highlightBus, windowTreeBus, type WindowNode, type WindowInfo, type RectInfo } from "@/bridge";
import { emptyBoundsFlashTokenAtom } from "./s-windows-tree-state";

// Live, mutable window-tree data lives in Valtio (mirroring the trace manager
// split): the fetched tree snapshot and the detailed info for the currently
// selected window. Discrete UI state (selection, expanded ids, active props
// tab) lives in Jotai atoms — see tab-windowstree/a-windows-tree-atoms.ts.

const HIGHLIGHT_COLOR_RGB = 0xff0000;
const HIGHLIGHT_BORDER_WIDTH = 2;
const HIGHLIGHT_BLINK_COUNT = 3;

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

function isBoundsEmpty(rect: RectInfo | null | undefined): boolean {
    if (!rect) {
        return true;
    }
    return rect.right <= rect.left || rect.bottom <= rect.top || rect.width <= 0 || rect.height <= 0;
}

function triggerEmptyBoundsFlash(): void {
    const store = getDefaultStore();
    store.set(emptyBoundsFlashTokenAtom, store.get(emptyBoundsFlashTokenAtom) + 1);
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

    if (isBoundsEmpty(info.rect)) {
        triggerEmptyBoundsFlash();
        return;
    }

    await highlightBus.highlightRect(
        {
            left: info.rect.left,
            top: info.rect.top,
            right: info.rect.right,
            bottom: info.rect.bottom,
        },
        {
            color: HIGHLIGHT_COLOR_RGB,
            borderWidth: HIGHLIGHT_BORDER_WIDTH,
            blinkCount: HIGHLIGHT_BLINK_COUNT,
        },
    );
}

export async function hideWindowHighlight(): Promise<void> {
    await highlightBus.hide();
}
