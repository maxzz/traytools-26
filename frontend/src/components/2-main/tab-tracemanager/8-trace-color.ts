import { type CSSProperties } from "react";

// 16-color console palette matching the backend TraceColorHex table and the
// WCOLOR_* macros in atl_trace.h. Index -1 means "no highlight".
export const TRACE_COLOR_HEX: readonly string[] = [
    "#000000", // 00 black
    "#000080", // 01 navy
    "#008000", // 02 green
    "#008080", // 03 teal
    "#800000", // 04 maroon
    "#800080", // 05 purple
    "#808000", // 06 olive
    "#c0c0c0", // 07 silver
    "#808080", // 08 gray
    "#0000ff", // 09 blue
    "#00ff00", // 10 lime
    "#00ffff", // 11 cyan
    "#ff0000", // 12 red
    "#ff00ff", // 13 magenta
    "#ffff00", // 14 yellow
    "#ffffff", // 15 white
];

export const TRACE_COLOR_NAMES: readonly string[] = [
    "black", "navy", "green", "teal", "maroon", "purple", "olive", "silver",
    "gray", "blue", "lime", "cyan", "red", "magenta", "yellow", "white",
];

// traceLineStyle returns the inline color style for a trace line, or undefined
// to fall back to the default foreground.
export function traceLineStyle(colorIndex: number, enabled: boolean): CSSProperties | undefined {
    if (!enabled || colorIndex < 0 || colorIndex > 15) {
        return undefined;
    }
    return { color: TRACE_COLOR_HEX[colorIndex] };
}
