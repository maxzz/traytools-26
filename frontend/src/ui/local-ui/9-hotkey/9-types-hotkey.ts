/**
 * Shared hotkey chord model for configurable shortcuts.
 * Ctrl / Alt / Shift plus A–Z, 0–9, number-row punctuation (` - =), or F1–F12.
 */

export type HotkeyChord = {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    /** Uppercase A–Z, digit 0–9, ` - =, or F1–F12 */
    key: string;
};

const KEY_PATTERN = /^(?:[A-Z0-9]|F(?:[1-9]|1[0-2])|[`\-=])$/;

/** Map a stored chord key to the KeyboardEvent.code used for matching. */
function eventCodeForHotkeyKey(key: string): string | null {
    if (/^[A-Z]$/.test(key)) {
        return `Key${key}`;
    }
    if (/^F(?:[1-9]|1[0-2])$/.test(key)) {
        return key;
    }
    if (/^[0-9]$/.test(key)) {
        return `Digit${key}`;
    }
    if (key === "`") {
        return "Backquote";
    }
    if (key === "-") {
        return "Minus";
    }
    if (key === "=") {
        return "Equal";
    }
    return null;
}

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

/** Display / persistence form, e.g. "Ctrl+Alt+U", "Ctrl+1", or "Ctrl+F5". */
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
        // Digits / punctuation keep their own form; letters / Fn keys use uppercase.
        const candidate = isHotkeyKey(upper) ? upper : token;
        if (isHotkeyKey(candidate) && !key) {
            key = candidate;
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
        } else {
            const digitMatch = /^Digit([0-9])$/.exec(event.code);
            if (digitMatch) {
                key = digitMatch[1];
            } else if (event.code === "Backquote") {
                key = "`";
            } else if (event.code === "Minus") {
                key = "-";
            } else if (event.code === "Equal") {
                key = "=";
            }
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
    const code = eventCodeForHotkeyKey(chord.key);
    return code !== null && event.code === code;
}
