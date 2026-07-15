/**
 * Shared hotkey chord model for configurable shortcuts.
 * Only Ctrl / Alt / Shift modifiers plus a single A–Z letter are allowed.
 */

export type HotkeyChord = {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    /** Uppercase A–Z */
    key: string;
};

export function isHotkeyChord(value: unknown): value is HotkeyChord {
    if (!value || typeof value !== "object") {
        return false;
    }
    const v = value as HotkeyChord;
    return (
        typeof v.ctrl === "boolean"
        && typeof v.alt === "boolean"
        && typeof v.shift === "boolean"
        && typeof v.key === "string"
        && /^[A-Z]$/.test(v.key)
        && (v.ctrl || v.alt || v.shift)
    );
}

/** Display / persistence form, e.g. "Ctrl+Alt+U". */
export function formatHotkey(chord: HotkeyChord | null | undefined): string {
    if (!chord || !isHotkeyChord(chord)) {
        return "";
    }
    const parts: string[] = [];
    if (chord.ctrl) {
        parts.push("Ctrl");
    }
    if (chord.alt) {
        parts.push("Alt");
    }
    if (chord.shift) {
        parts.push("Shift");
    }
    parts.push(chord.key);
    return parts.join("+");
}

export function parseHotkey(text: string | null | undefined): HotkeyChord | null {
    if (!text?.trim()) {
        return null;
    }

    const tokens = text.split("+").map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) {
        return null;
    }

    let ctrl = false;
    let alt = false;
    let shift = false;
    let key = "";

    for (const token of tokens) {
        const upper = token.toUpperCase();
        if (upper === "CTRL" || upper === "CONTROL") {
            ctrl = true;
            continue;
        }
        if (upper === "ALT") {
            alt = true;
            continue;
        }
        if (upper === "SHIFT") {
            shift = true;
            continue;
        }
        if (/^[A-Z]$/.test(upper) && !key) {
            key = upper;
            continue;
        }
        return null;
    }

    const chord: HotkeyChord = { ctrl, alt, shift, key };
    return isHotkeyChord(chord) ? chord : null;
}

/** Build a chord from a KeyboardEvent; returns null if the event is not a valid binding. */
export function chordFromKeyboardEvent(event: KeyboardEvent): HotkeyChord | null {
    if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
        return null;
    }

    const match = /^Key([A-Z])$/.exec(event.code);
    if (!match) {
        return null;
    }

    return {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        key: match[1],
    };
}

export function matchesHotkey(event: KeyboardEvent, chord: HotkeyChord | null | undefined): boolean {
    if (!chord || !isHotkeyChord(chord)) {
        return false;
    }
    if (event.ctrlKey !== chord.ctrl || event.altKey !== chord.alt || event.shiftKey !== chord.shift) {
        return false;
    }
    return event.code === `Key${chord.key}`;
}
