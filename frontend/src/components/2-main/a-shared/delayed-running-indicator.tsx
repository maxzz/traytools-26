import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";

const RUNNING_INDICATOR_DELAY_MS = 2000;

/** Shows only after a delay so short-lived jobs never flash "running". */
export function DelayedRunningIndicator({ running }: { running: boolean; }) {
    const [show, setShow] = useState(false);

    useEffect(
        () => {
            if (!running) {
                setShow(false);
                return;
            }
            const id = setTimeout(() => setShow(true), RUNNING_INDICATOR_DELAY_MS);
            return () => clearTimeout(id);
        },
        [running]
    );

    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.span
                    className="shrink-0 text-muted-foreground inline-flex items-center gap-1 overflow-hidden"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    <Loader2 className="size-3 animate-spin" />
                    running
                </motion.span>
            )}
        </AnimatePresence>
    );
}
