import { type ReactNode } from "react";
import { AppWindow, ChevronsUpDown, Layers, List, ListTree, Menu, Minus, RectangleHorizontal, Square, Type } from "lucide-react";

export function isChildWindowStyle(style: number): boolean {
    return (style & WS_CHILD) !== 0;
}

/** Style-bit fallback used when no class-specific icon applies. */
export function windowStyleIcon(style: number): ReactNode {
    if (style & WS_CHILD) {
        return <Square className={iconClasses} />;
    }
    if (style & WS_POPUP) {
        return <Layers className={iconClasses} />;
    }
    return <AppWindow className={iconClasses} />;
}

export const WS_CHILD = 0x40000000;
export const WS_POPUP = 0x80000000;

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
            return <Square className={iconClasses} />;
        case "edit":
        case "richedit":
        case "richedit20a":
        case "richedit20w":
        case "richedit50w":
        case "scintilla":
            return <Type className={iconClasses} />;
        case "static":
            return <Type className={iconClasses} />;
        case "combobox":
        case "comboboxex32":
            return <ChevronsUpDown className={iconClasses} />;
        case "listbox":
        case "syslistview32":
            return <List className={iconClasses} />;
        case "systreeview32":
            return <ListTree className={iconClasses} />;
        case "systabcontrol32":
        case "sysheader32":
            return <RectangleHorizontal className={iconClasses} />;
        case "toolbarwindow32":
        case "#32768":
            return <Menu className={iconClasses} />;
        case "msctls_statusbar32":
            return <Minus className={iconClasses} />;
        default:
            return null;
    }
}

const iconClasses = "size-3.5";
