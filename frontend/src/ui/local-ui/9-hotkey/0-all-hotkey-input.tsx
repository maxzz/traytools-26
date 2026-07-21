import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { classNames } from "@/utils";
import { X } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { earthFills, IconEarth } from "@/ui/icons";
import { type HotkeyChord, keyboardEventToHotkeyChord, stringFromHotkeyChord } from "./9-types-hotkey";

type HotkeyInputProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
    value: HotkeyChord | null;
    onChange: (next: HotkeyChord | null) => void;
    isGlobal?: boolean; // When provided with `onIsGlobalChange`, shows a Global toggle inside the field.
    onIsGlobalChange?: (next: boolean) => void;
    placeholder?: string; // Placeholder when empty / not recording.
};

/**
 * Click-to-capture hotkey editor. Accepts Ctrl/Alt/Shift + A–Z, 0–9,
 * number-row punctuation (` - =), or F1–F12.
 * Escape cancels recording; Backspace/Delete clears the binding.
 */
export function HotkeyInput({ value, onChange, isGlobal, onIsGlobalChange, placeholder, className, ...rest }: HotkeyInputProps) {

    const [recording, setRecording] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const showGlobalBtn = !!onIsGlobalChange;

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

    const displayValue = recording ? "Press shortcut…" : (stringFromHotkeyChord(value) || placeholder || "");

    return (
        <div className="relative">
            <Input
                className={classNames(
                    "h-7 font-condensed cursor-pointer",
                    showGlobalBtn ? "pr-14" : "pr-8",
                    recording && "border-sky-500 ring-1 ring-sky-500/40",
                    !value && !recording && "text-muted-foreground",
                    className,
                )}
                readOnly
                ref={inputRef}
                value={displayValue}
                onClick={() => { setRecording(true); inputRef.current?.focus(); }}
                onFocus={() => setRecording(true)}
                onBlur={() => { requestAnimationFrame(() => stopRecording()); }} // Defer so button clicks can run first.
                placeholder={placeholder}
                aria-label="Hotkey shortcut"
                {...rest}
            />

            <div className="absolute inset-y-0 right-0 flex items-center">
                <Button
                    size="icon-xs"
                    variant="ghost"
                    disabled={!value && !recording}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onChange(null); stopRecording(); }}
                    type="button"
                    aria-label="Clear shortcut"
                    title="Clear shortcut"
                >
                    <X />
                </Button>

                {showGlobalBtn && (<>
                    <Button
                        className={classNames("w-8 h-7 active:translate-y-0! border border-border rounded-l-none", isGlobal && "bg-muted dark:bg-muted-foreground/20")}
                        size="icon-xs"
                        variant="ghost"
                        disabled={!value}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onIsGlobalChange(!isGlobal)}
                        type="button"
                        aria-pressed={isGlobal}
                        aria-label="Global system-wide hotkey"
                        title="Global system-wide hotkey"
                    >
                        {/* <div className="w-px h-full border-l border-border"></div> */}
                        <IconEarth className={classNames("mx-1 size-3.5", !value && "opacity-50", isGlobal ? "stroke-foreground/30 dark:stroke-background/40" : "stroke-foreground/50 dark:stroke-foreground/50")} earthFills={isGlobal ? earthFills : undefined} />
                    </Button>
                </>)}
            </div>
        </div>
    );
}
