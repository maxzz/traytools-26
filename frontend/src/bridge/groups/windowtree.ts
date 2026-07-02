import { dispatch } from "../dispatch";

const GROUP = "windowtree";

// Types mirror the JSON produced by backend/windowtree (types.go).

export interface WindowNode {
    handle: string;
    className: string;
    title: string;
    processId: number;
    threadId: number;
    style: number;
    exStyle: number;
    visible: boolean;
    children?: WindowNode[];
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
}

// Windows Tree command group. Mirrors the "windowtree" group on the backend
// bus (manager.go). getTree returns the whole desktop window tree; getWindowInfo
// returns the detailed properties for one window on demand.
export const windowTreeBus = {
    getTree: () => dispatch<WindowTree>(GROUP, "getTree"),
    getWindowInfo: (handle: string) => dispatch<WindowInfo>(GROUP, "getWindowInfo", { handle }),
};
