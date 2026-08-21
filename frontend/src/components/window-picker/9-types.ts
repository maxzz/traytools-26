export type WindowPickerPoint = {
    x: number;
    y: number;
};

/** Payload streamed from Go during a finder drag, and once more on mouse-up. */
export type WindowPickerEvent = {
    released: boolean;
    processName: string;
    screen: WindowPickerPoint;
    client: WindowPickerPoint;
    handle?: string;
    rootHandle?: string;
    title?: string;
};

export type WindowPickerDragIcon = "cursor" | "overlay";
export type WindowPickerOverlayCursor = "hide" | "show";

export function normalizeDragIcon(value: string | undefined): WindowPickerDragIcon {
    return value === "cursor" ? "cursor" : "overlay";
}

export function normalizeOverlayCursor(value: string | undefined): WindowPickerOverlayCursor {
    return value === "show" ? "show" : "hide";
}

/** Token passed to Go: "cursor" | "overlay" | "overlay-show". */
export function windowPickerStartMode(dragIcon: string | undefined, overlayCursor: string | undefined): string {
    if (normalizeDragIcon(dragIcon) === "cursor") {
        return "cursor";
    }
    return normalizeOverlayCursor(overlayCursor) === "show" ? "overlay-show" : "overlay";
}

export type WindowPickerReleasedHandler = (result: WindowPickerEvent) => void;

export type WindowPickerState = {
    active: boolean;
    released: boolean;
    iconMode: WindowPickerDragIcon;
    overlayShowCursor: boolean;
    processName: string;
    screen: WindowPickerPoint;
    client: WindowPickerPoint;
    handle: string;
    rootHandle: string;
    title: string;
};

export const emptyWindowPickerState: WindowPickerState = {
    active: false,
    released: false,
    iconMode: "overlay",
    overlayShowCursor: false,
    processName: "",
    screen: { x: 0, y: 0 },
    client: { x: 0, y: 0 },
    handle: "",
    rootHandle: "",
    title: "",
};
