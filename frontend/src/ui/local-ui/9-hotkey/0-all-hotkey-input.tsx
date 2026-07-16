import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { classNames } from "@/utils";
import { earthFillsDefault, IconEarth } from "@/ui/icons";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { keyboardEventToHotkeyChord, stringFromHotkeyChord, type HotkeyChord } from "./9-types-hotkey";

type HotkeyInputProps = Omit<ComponentProps<"div">, "onChange"> & {
    value: HotkeyChord | null;
    onChange: (next: HotkeyChord | null) => void;
    /** Placeholder when empty / not recording. */
    placeholder?: string;
    /** When provided with `onGlobalChange`, shows a Global toggle inside the field. */
    global?: boolean;
    onGlobalChange?: (next: boolean) => void;
};

/**
 * Click-to-capture hotkey editor. Accepts Ctrl/Alt/Shift + A–Z, 0–9,
 * number-row punctuation (` - =), or F1–F12.
 * Escape cancels recording; Backspace/Delete clears the binding.
 */
export function HotkeyInput({
    value,
    onChange,
    onGlobalChange,
    placeholder = "",
    global = false,
    className,
    ...rest
}: HotkeyInputProps) {
    const [recording, setRecording] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const showGlobal = onGlobalChange != null;

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

                const chord = keyboardEventToHotkeyChord(event);
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

            const controller = new AbortController();
            window.addEventListener("keydown", onKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [recording, onChange, stopRecording],
    );

    const display = recording ? "Press shortcut…" : (stringFromHotkeyChord(value) || placeholder);
    const endPad = showGlobal ? "pr-14" : "pr-8";

    return (
        <div className={classNames("relative", className)} {...rest}>
            <Input
                ref={inputRef}
                readOnly
                className={classNames(
                    "h-7 font-mono cursor-pointer",
                    endPad,
                    recording && "border-sky-500 ring-1 ring-sky-500/40",
                    !value && !recording && "text-muted-foreground",
                )}
                value={display}
                onClick={() => { setRecording(true); inputRef.current?.focus(); }}
                onFocus={() => setRecording(true)}
                onBlur={() => { requestAnimationFrame(() => stopRecording()); }} // Defer so button clicks can run first.
                placeholder={placeholder}
                aria-label="Hotkey shortcut"
            />

            <div className="absolute inset-y-0 right-0.5 flex items-center">
                <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Clear shortcut"
                    title="Clear shortcut"
                    disabled={!value && !recording}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onChange(null); stopRecording(); }}
                >
                    <X />
                </Button>

                {showGlobal && (
                    <Button
                        type="button"
                        size="icon-xs"
                        variant={global ? "secondary" : "ghost"}
                        aria-pressed={global}
                        aria-label="Global system-wide hotkey"
                        title="Global system-wide hotkey"
                        disabled={!value}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onGlobalChange(!global)}
                    //className={classNames(global && "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/40 dark:text-sky-300")}
                    >
                        <IconEarth className={classNames("size-3.5", global && "stroke-current")} earthFills={global ? earthFillsDefault : undefined} />
                    </Button>
                )}
            </div>
        </div>
    );
}
