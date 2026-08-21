import { type ReactNode } from "react";
import { AppWindow, ChevronsUpDown, Layers, List, ListTree, Menu, Minus, RectangleHorizontal, Square, Type } from "lucide-react";

export const WS_CHILD = 0x40000000;
export const WS_POPUP = 0x80000000;

const ICON = "size-3.5";

export function isChildWindowStyle(style: number): boolean {
    return (style & WS_CHILD) !== 0;
}

/** Style-bit fallback used when no class-specific icon applies. */
export function windowStyleIcon(style: number): ReactNode {
    if (style & WS_CHILD) {
        return <Square className={ICON} />;
    }
    if (style & WS_POPUP) {
        return <Layers className={ICON} />;
    }
    return <AppWindow className={ICON} />;
}

/**
 * Icon for a child/control window based on its Win32 class name.
 * Returns null for unknown classes so the caller can fall back to windowStyleIcon.
 */
export function iconForWindowClass(className: string): ReactNode | null {
    const cls = className.trim().toLowerCase();
    if (!cls) {
        return null;
    }

    switch (cls) {
        case "button":
            return <Square className={ICON} />;
        case "edit":
        case "richedit":
        case "richedit20a":
        case "richedit20w":
        case "richedit50w":
        case "scintilla":
            return <Type className={ICON} />;
        case "static":
            return <Type className={ICON} />;
        case "combobox":
        case "comboboxex32":
            return <ChevronsUpDown className={ICON} />;
        case "listbox":
        case "syslistview32":
            return <List className={ICON} />;
        case "systreeview32":
            return <ListTree className={ICON} />;
        case "systabcontrol32":
        case "sysheader32":
            return <RectangleHorizontal className={ICON} />;
        case "toolbarwindow32":
        case "#32768":
            return <Menu className={ICON} />;
        case "msctls_statusbar32":
            return <Minus className={ICON} />;
        default:
            return null;
    }
}
