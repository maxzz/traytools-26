import { useSnapshot } from "valtio";
import { motion } from "motion/react";
import { windowPickerStore } from "./a-store";

/** Live finder coordinates for the status bar. Does not affect header layout. */
export function WindowPickerStatusReadout() {
    const snap = useSnapshot(windowPickerStore);

    return (
        <motion.div
            className="absolute inset-0 px-2 min-w-0 flex items-center gap-4 tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
            transition={{ duration: 0.18, ease: "easeOut" }}
        >
            <span className="shrink-0 text-muted-foreground min-w-16">
                Screen <span className="text-foreground">{snap.screen.x}, {snap.screen.y}</span>
            </span>

            <span className="shrink-0 text-muted-foreground min-w-16">
                Client <span className="text-foreground">{snap.client.x}, {snap.client.y}</span>
            </span>

            <span className="min-w-0 truncate text-foreground" title={snap.title || snap.processName || undefined}>
                {snap.processName || "No window"}
            </span>
        </motion.div>
    );
}
