import { useEffect, useRef, useState } from "react";

/** Brief toolbar feedback after Ctrl+S ("saved" / "no changes to save"). */
export function useSaveNotice(durationMs = 2500) {
    const [message, setMessage] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(
        () => () => {
            if (timerRef.current !== undefined) {
                clearTimeout(timerRef.current);
            }
        },
        [],
    );

    return {
        message,
        show(next: string) {
            setMessage(next);
            if (timerRef.current !== undefined) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => setMessage(""), durationMs);
        },
    };
}

/** While mounted (active tab), Ctrl/Cmd+S runs onSave and prevents the browser save dialog. */
export function useCtrlSSave(onSave: () => void | Promise<void>) {
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    useEffect(
        () => {
            function handleKeyDown(event: KeyboardEvent) {
                const ctrlOrCmd = event.ctrlKey || event.metaKey;
                if (!ctrlOrCmd || event.altKey || event.shiftKey) {
                    return;
                }
                if (event.code !== "KeyS" && event.key.toLowerCase() !== "s") {
                    return;
                }
                event.preventDefault();
                void onSaveRef.current();
            }

            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        },
        [],
    );
}
