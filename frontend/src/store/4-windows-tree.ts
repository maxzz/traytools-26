import { proxy } from "valtio";
import { windowTreeBus, type WindowNode, type WindowInfo } from "@/bridge";

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
