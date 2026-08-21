import { useCallback } from "react";
import { WindowPickerControl, type WindowPickerEvent } from "@/components/window-picker";
import { selectPickedWindowInTree } from "./a-windows-tree-calls";

/** Finder control for the Windows toolbar; selects the released window in the tree. */
export function WindowPickerInToolbar() {
    const onReleased = useCallback(
        (result: WindowPickerEvent) => {
            void selectPickedWindowInTree(result);
        },
        []
    );

    return (
        <WindowPickerControl onReleased={onReleased} />
    );
}
