import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { chordFromKeyboardEvent, formatHotkey, type HotkeyChord } from "./1-hotkey-types";

type HotkeyInputProps = Omit<ComponentProps<"div">, "onChange"> & {
    value: HotkeyChord | null;
    onChange: (next: HotkeyChord | null) => void;
    /** Placeholder when empty / not recording. */
    placeholder?: string;
};

/**
 * Click-to-capture hotkey editor. Accepts Ctrl/Alt/Shift + A–Z or F1–F12.
 * Escape cancels recording; Backspace/Delete clears the binding.
 */
export function HotkeyInput({
    value,
    onChange,
    placeholder = "Click to set shortcut",
    className,
    ...rest
}: HotkeyInputProps) {
    const [recording, setRecording] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const stopRecording = useCallback(() => setRecording(false), []);

    useEffect(
        () => {
            if (!recording) {
                return;
            }

            function onKeyDown(event: KeyboardEvent) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    stopRecording();
                    return;
                }

                if (event.key === "Backspace" || event.key === "Delete") {
                    event.preventDefault();
                    event.stopPropagation();
                    onChange(null);
                    stopRecording();
                    return;
                }

                // Ignore bare modifier presses while composing the chord.
                if (event.key === "Control" || event.key === "Alt" || event.key === "Shift" || event.key === "Meta") {
                    event.preventDefault();
                    return;
                }

                const chord = chordFromKeyboardEvent(event);
                if (!chord) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                onChange(chord);
                stopRecording();
            }

            window.addEventListener("keydown", onKeyDown, true);
            return () => window.removeEventListener("keydown", onKeyDown, true);
        },
        [recording, onChange, stopRecording],
    );

    const display = recording
        ? "Press shortcut…"
        : (formatHotkey(value) || placeholder);

    return (
        <div className={classNames("flex items-center gap-1", className)} {...rest}>
            <Input
                ref={inputRef}
                readOnly
                value={display}
                placeholder={placeholder}
                className={classNames(
                    "h-7 font-mono cursor-pointer",
                    recording && "border-sky-500 ring-1 ring-sky-500/40",
                    !value && !recording && "text-muted-foreground",
                )}
                onFocus={() => setRecording(true)}
                onBlur={() => {
                    // Defer so a Clear click can run first.
                    requestAnimationFrame(() => stopRecording());
                }}
                onClick={() => {
                    setRecording(true);
                    inputRef.current?.focus();
                }}
                aria-label="Hotkey shortcut"
            />

            <Button
                type="button"
                variant="outline"
                size="xs"
                className="shrink-0 px-2 h-7"
                disabled={!value && !recording}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                    onChange(null);
                    stopRecording();
                }}
                title="Clear shortcut"
            >
                Clear
            </Button>
        </div>
    );
}
