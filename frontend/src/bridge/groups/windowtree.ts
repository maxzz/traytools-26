import { dispatch } from "../dispatch";
import type { IntegrityLevel } from "./dpagent";

const GROUP = "windowtree";

// Types mirror the JSON produced by backend/windowtree (types.go).

export interface WindowNode {
    handle: string;
    className: string;
    title: string;
    processId: number;
    threadId: number;
    /** Image basename (e.g. chrome.exe); empty when the process could not be queried. */
    processName: string;
    style: number;
    exStyle: number;
    visible: boolean;
    children?: WindowNode[];
}

/** Synthetic folder node used when "Group windows by process name" is on. */
export function isProcessGroupHandle(handle: string): boolean {
    return handle.startsWith("proc:");
}

export interface WindowTree {
    root: WindowNode;
    count: number;
}

export interface RectInfo {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

export interface RelatedWindow {
    handle: string;
    className: string;
}

export interface WindowInfo {
    valid: boolean;

    handle: string;
    caption: string;
    className: string;
    unicode: boolean;
    style: number;
    exStyle: number;
    visible: boolean;
    enabled: boolean;
    rect: RectInfo;
    clientRect: RectInfo;
    controlId: number;
    instance: string;
    userData: string;
    parent: RelatedWindow;
    owner: RelatedWindow;

    styleNames: string[];
    exStyleNames: string[];

    classAtom: string;
    classStyle: number;
    classExtraBytes: number;
    windowExtraBytes: number;

    processId: number;
    threadId: number;
    processName: string;
    processPath: string;
    /** 32 or 64 when known; 0 when the process could not be queried. */
    bits: number;
    /** DOMAIN\User for the process token owner. */
    userName: string;
    integrity: IntegrityLevel;
}

export interface MonitorWindow {
    handle: string;
    className: string;
    title: string;
    valid: boolean;
    noWindow: boolean;
    processId: number;
    threadId: number;
}

export interface ActiveWindowsInfo {
    foreground: MonitorWindow;
    active: MonitorWindow;
    focus: MonitorWindow;
    capture: MonitorWindow;
    threadId: number;
    systemWide: boolean;
}

/**
 * Windows Tree command group. Mirrors the "windowtree" group on the backend
 * bus (manager.go). 
 * 
 * - getTree returns the whole desktop window tree; 
 * - getWindowInfo returns the detailed properties for one window on demand.
 * - getActiveWindows returns a single snapshot of the local input state
 *   (foreground / active / focus / capture windows) for the Active Monitor tab,
 *   which polls it periodically.
 */
export const windowTreeBus = {
    getTree: () => dispatch<WindowTree>(GROUP, "getTree"),
    getWindowInfo: (handle: string) => dispatch<WindowInfo>(GROUP, "getWindowInfo", { handle }),
    getActiveWindows: () => dispatch<ActiveWindowsInfo>(GROUP, "getActiveWindows"),
};
