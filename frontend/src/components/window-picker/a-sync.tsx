import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { windowPickerBus } from "@/bridge";
import { applyWindowPickerEventJson, stopWindowPicker, windowPickerStore } from "./a-store";

/** Mount once at app root so finder events reach the Valtio store from any control. */
export function WindowPickerSync() {
    const { active, iconMode, overlayShowCursor } = useSnapshot(windowPickerStore);
    const overlayActive = active && iconMode === "overlay";

    useEffect(
        () => {
            const unsubscribe = windowPickerBus.subscribe(applyWindowPickerEventJson);
            return () => {
                unsubscribe();
                void stopWindowPicker();
            };
        },
        []
    );

    if (!overlayActive) {
        return null;
    }

    return (
        <div
            className={classNames(
                "fixed inset-0 z-9999 select-none",
                overlayShowCursor ? "cursor-default" : "cursor-none"
            )}
            aria-hidden
        />
    );
}
