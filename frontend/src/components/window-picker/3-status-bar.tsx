import { AnimatePresence, motion } from "motion/react";
import { useSnapshot } from "valtio";
import { windowPickerStore } from "./a-store";
import { WindowPickerStatusReadout } from "./2-status-readout";

/**
 * Status bar used on the Windows tab. Always visible (the footer hide setting
 * does not apply). During a finder drag it shows screen/client coordinates.
 */
export function WindowPickerStatusBar() {
    const { active } = useSnapshot(windowPickerStore);

    return (
        <div
            data-app-windows-status
            className="shrink-0 h-7 text-[.65rem] bg-muted/20 border-t border-border flex items-center"
        >
            <div className="relative flex-1 min-w-0 h-full overflow-hidden">
                <AnimatePresence initial={false} mode="popLayout">
                    {active
                        ? <WindowPickerStatusReadout key="window-picker" />
                        : <ReadyRow key="ready" />
                    }
                </AnimatePresence>
            </div>
        </div>
    );
}

function ReadyRow() {
    return (
        <motion.div
            className="absolute inset-0 px-2 flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
            transition={{ duration: 0.22, ease: "easeOut" }}
        >
            <span className="text-muted-foreground">Ready</span>
        </motion.div>
    );
}
