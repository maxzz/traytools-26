import { type ComponentProps, useEffect, useState } from "react";
import { classNames } from "@/utils/classnames";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";

/** Shows only after a delay so short-lived jobs never flash a status. */
export function DelayedRunningIndicator({ running, className, children = defaultChildren, ...rest }: { running: boolean; } & ComponentProps<typeof motion.span>) {
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
        [running]);

    return (
        <AnimatePresence initial={false}>
            {show ? (
                <motion.span
                    className={classNames("shrink-0 text-muted-foreground inline-flex items-center gap-1 overflow-hidden", className)}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    {...rest}
                >
                    {children}
                </motion.span>
            ) : <div />}
        </AnimatePresence>
    );
}

const RUNNING_INDICATOR_DELAY_MS = 2000;

const defaultChildren = (<>
    <Loader2 className="size-3 animate-spin" />
    running
</>);
