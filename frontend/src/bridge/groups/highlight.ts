import { dispatch } from "../dispatch";

const GROUP = "highlight";

export type HighlightRectOptions = {
    color?: number;       // RGB 0xRRGGBB; 0 / omitted means default red
    borderWidth?: number;
    blinkCount?: number;
};

export type HighlightBounds = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

/**
 * Screen rectangle highlight group. Mirrors the "highlight" group on the
 * backend bus (layered Win32 overlay with optional blink).
 */
export const highlightBus = {
    highlightRect: (bounds: HighlightBounds, options?: HighlightRectOptions) =>
        dispatch(GROUP, "highlightRect", {
            left: bounds.left,
            top: bounds.top,
            right: bounds.right,
            bottom: bounds.bottom,
            color: options?.color ?? 0,
            borderWidth: options?.borderWidth ?? 0,
            blinkCount: options?.blinkCount ?? 0,
        }),
    hide: () => dispatch(GROUP, "hide"),
};
