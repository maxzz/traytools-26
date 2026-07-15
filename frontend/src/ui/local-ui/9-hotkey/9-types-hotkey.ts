/**
 * Shared hotkey chord model for configurable shortcuts.
 * Ctrl / Alt / Shift plus a single A–Z letter or F1–F12 key.
 */

export type HotkeyChord = {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    /** Uppercase A–Z, or F1–F12 */
    key: string;
};

const KEY_PATTERN = /^(?:[A-Z]|F(?:[1-9]|1[0-2]))$/;

export function isHotkeyKey(key: string): boolean {
    return KEY_PATTERN.test(key);
}

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
        && isHotkeyKey(v.key)
        && (v.ctrl || v.alt || v.shift)
    );
}

/** Display / persistence form, e.g. "Ctrl+Alt+U" or "Ctrl+F5". */
export function stringFromHotkeyChord(chord: HotkeyChord | null | undefined): string {
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

export function stringToHotkeyChord(text: string | null | undefined): HotkeyChord | null {
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
        if (isHotkeyKey(upper) && !key) {
            key = upper;
            continue;
        }
        return null;
    }

    const chord: HotkeyChord = { ctrl, alt, shift, key };
    return isHotkeyChord(chord) ? chord : null;
}

/** Build a chord from a KeyboardEvent; returns null if the event is not a valid binding. */
export function keyboardEventToHotkeyChord(event: KeyboardEvent): HotkeyChord | null {
    if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
        return null;
    }

    let key = "";
    const letterMatch = /^Key([A-Z])$/.exec(event.code);
    if (letterMatch) {
        key = letterMatch[1];
    } else {
        const fnMatch = /^F([1-9]|1[0-2])$/.exec(event.code);
        if (fnMatch) {
            key = event.code; // "F1".."F12"
        }
    }

    if (!key) {
        return null;
    }

    return {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        key,
    };
}

export function matchesHotkey(event: KeyboardEvent, chord: HotkeyChord | null | undefined): boolean {
    if (!chord || !isHotkeyChord(chord)) {
        return false;
    }
    if (event.ctrlKey !== chord.ctrl || event.altKey !== chord.alt || event.shiftKey !== chord.shift) {
        return false;
    }
    if (chord.key.startsWith("F")) {
        return event.code === chord.key;
    }
    return event.code === `Key${chord.key}`;
}
