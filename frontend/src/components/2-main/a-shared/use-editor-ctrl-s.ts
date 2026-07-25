import { useEffect, useRef, useState } from "react";

/** Brief toolbar feedback after Ctrl+S ("saved" / "no changes to save"). */
export function useSaveNotice(durationMs = 2500): { message: string; show(next: string): void; } {
    const [message, setMessage] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(
        () => () => {
            if (timerRef.current !== undefined) {
                clearTimeout(timerRef.current);
            }
        },
        []);

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
    useEditorCtrlKey("s", onSave);
}

/** While mounted (active tab), Ctrl/Cmd+N runs onAdd (e.g. Add Copy Item). */
export function useCtrlNAdd(onAdd: () => void | Promise<void>) {
    useEditorCtrlKey("n", onAdd);
}

function useEditorCtrlKey(key: "s" | "n", onAction: () => void | Promise<void>) {
    const onActionRef = useRef(onAction);
    onActionRef.current = onAction;

    useEffect(
        () => {
            function handleKeyDown(event: KeyboardEvent) {
                const ctrlOrCmd = event.ctrlKey || event.metaKey;
                if (!ctrlOrCmd || event.altKey || event.shiftKey) {
                    return;
                }
                const code = key === "s" ? "KeyS" : "KeyN";
                if (event.code !== code && event.key.toLowerCase() !== key) {
                    return;
                }
                event.preventDefault();
                void onActionRef.current();
            }

            const controller = new AbortController();
            window.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [key]);
}
