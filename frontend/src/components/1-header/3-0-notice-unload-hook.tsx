import { type ReactNode } from "react";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { IconStopCircle, SymbolInfo } from "@/ui/icons";
import { unloadHookNoticeStore } from "./3-1-notice-unload-hook-state";

/** Header notice shown after "Send unload hook notification" (same pattern as TimelineBuildNotice). */
export function UnloadHookNotice() {
    const { type, message } = useSnapshot(unloadHookNoticeStore);
    const show = Boolean(type && message);

    const buttonClasses = classNames("px-2 h-6 text-xs opacity-100! rounded",
        type === "success"
            ? "text-green-600 bg-green-300/10 border border-green-500/50"
            : type === "info"
                ? "text-sky-600 bg-sky-300/10 border border-sky-500/50"
                : "text-red-500 bg-red-300/10 border border-red-500/30"
    );

    return (
        <AnimatedNotice show={show}>
            <Button className={buttonClasses} variant="ghost" size="sm" disabled>
                {type === "error"
                    ? <IconStopCircle className="size-3" />
                    : <SymbolInfo className="size-3" />
                }
                {message}
            </Button>
        </AnimatedNotice>
    );
}

function AnimatedNotice({ show, children, appearDelay = 1 }: { show: boolean; children: ReactNode; appearDelay?: number; }) {
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    layout
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto", transition: { duration: 0.2, delay: appearDelay, ease: "easeIn" } }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden flex"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
