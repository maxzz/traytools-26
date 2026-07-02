// Frontend mirror of backend/tracemanager/tracecolor.go. The legacy CTraceWindow
// stripped a TRACECOLOR_PREFIX + 2-hex-digit color index + TRACECOLOR_SUFIX
// from the start of the trace text and used the index to pick one of 16
// console colors. We reproduce that here so trace lines render with the same
// color semantics as the original WTL listview.

const TRACE_COLOR_PREFIX = "\x01\x02";
const TRACE_COLOR_SUFFIX = "\x03";

export interface ParsedTraceText {
    colorIndex: number | null; // null when no color marker is present
    text: string; // text with the marker stripped
}

const PREFIX_LEN = TRACE_COLOR_PREFIX.length;
const SUFFIX_LEN = TRACE_COLOR_SUFFIX.length;
const NUMBER_LEN = 2;
const TOTAL_LEN = PREFIX_LEN + NUMBER_LEN + SUFFIX_LEN;

const HEX = "0123456789abcdef";

export function parseTraceColor(raw: string): ParsedTraceText {
    if (raw.length < TOTAL_LEN) return { colorIndex: null, text: raw };
    if (!raw.startsWith(TRACE_COLOR_PREFIX)) return { colorIndex: null, text: raw };

    const hi = HEX.indexOf(raw[PREFIX_LEN].toLowerCase());
    const lo = HEX.indexOf(raw[PREFIX_LEN + 1].toLowerCase());
    if (hi < 0 || lo < 0) return { colorIndex: null, text: raw };

    if (raw[PREFIX_LEN + NUMBER_LEN] !== TRACE_COLOR_SUFFIX) {
        return { colorIndex: null, text: raw };
    }

    const colorIndex = hi * 16 + lo;
    if (colorIndex < 0 || colorIndex > 15) return { colorIndex: null, text: raw };

    return { colorIndex, text: raw.slice(TOTAL_LEN) };
}

// The 16 RGB colors from the legacy ATTRIBUTES table, mapped to the console
// palette. Index 0 is black (treated as default foreground here to stay
// readable on light/dark backgrounds).
const COLOR_RGB: readonly string[] = [
    "#000000", "#000080", "#008000", "#008080",
    "#800000", "#800080", "#808000", "#c0c0c0",
    "#808080", "#0000ff", "#00ff00", "#00ffff",
    "#ff0000", "#ff00ff", "#ffff00", "#ffffff",
];

export function traceColorHex(colorIndex: number | null): string | undefined {
    if (colorIndex == null) return undefined;
    if (colorIndex === 0) return undefined; // default fg
    return COLOR_RGB[colorIndex] ?? undefined;
}
