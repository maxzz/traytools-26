import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { Globe, X } from "lucide-react";
import { classNames } from "@/utils";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { keyboardEventToHotkeyChord, stringFromHotkeyChord, type HotkeyChord } from "./9-types-hotkey";
import { IconEarth } from "@/ui/icons";

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
    placeholder = "Click to set shortcut",
    global = false,
    onGlobalChange,
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

    return (
        <InputGroup
            className={classNames(
                "h-7 rounded-sm",
                recording && "border-sky-500 ring-1 ring-sky-500/40",
                className,
            )}
            {...rest}
        >
            <InputGroupInput
                ref={inputRef}
                readOnly
                className={classNames(
                    "h-7 font-mono cursor-pointer",
                    !value && !recording && "text-muted-foreground",
                )}
                value={display}
                onClick={() => { setRecording(true); inputRef.current?.focus(); }}
                onFocus={() => setRecording(true)}
                onBlur={() => { requestAnimationFrame(() => stopRecording()); }} // Defer so addon clicks can run first.
                placeholder={placeholder}
                aria-label="Hotkey shortcut"
            />

            <InputGroupAddon align="inline-end" className="gap-0.5">
                {showGlobal && (
                    <InputGroupButton
                        size="icon-xs"
                        variant={global ? "secondary" : "ghost"}
                        aria-pressed={global}
                        aria-label="Global system-wide hotkey"
                        title="Global system-wide hotkey"
                        disabled={!value}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onGlobalChange(!global)}
                        className={classNames(
                            global && "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/40 dark:text-sky-300",
                        )}
                    >
                        <IconEarth />
                    </InputGroupButton>
                )}

                <InputGroupButton
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Clear shortcut"
                    title="Clear shortcut"
                    disabled={!value && !recording}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onChange(null); stopRecording(); }}
                >
                    <X />
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    );
}
