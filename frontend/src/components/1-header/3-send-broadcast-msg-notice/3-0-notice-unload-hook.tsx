import { type ComponentProps, type ReactNode } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/ui/shadcn/button";
import { IconStopCircle, SymbolInfo } from "@/ui/icons";
import { unloadHookNoticeStore } from "./3-1-notice-unload-hook-state";

/** Header notice overlaid on the main tabs (avoids pushing the header layout). */
export function UnloadHookNotice({ className, ...rest }: ComponentProps<"div">) {
    const { type, message } = useSnapshot(unloadHookNoticeStore);
    const show = Boolean(type && message);

    const buttonClasses = classNames("px-2 h-6 text-xs opacity-100! rounded shadow-sm",
        type === "success"
            ? "text-green-600 bg-background border border-green-500/50"
            : type === "info"
                ? "text-sky-600 bg-background border border-sky-500/50"
                : "text-red-500 bg-background border border-red-500/30"
    );

    return (
        <div className={classNames(className)} {...rest}>
            <AnimatedNotice show={show} appearDelay={0}>
                <Button className={buttonClasses} variant="ghost" size="sm" disabled>
                    {type === "error"
                        ? <IconStopCircle className="size-3" />
                        : <SymbolInfo className="size-3" />
                    }
                    {message}
                </Button>
            </AnimatedNotice>
        </div>
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
