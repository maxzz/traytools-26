import { type ReactNode } from "react";
import { cn } from "@/utils/classnames";
import { AnimatePresence, motion } from "motion/react";

export type FlashNoticeKind = "loading" | "error" | "info" | "warning";

const kindClasses: Record<FlashNoticeKind, string> = {
    loading: "text-white bg-sky-500",
    error: "text-white bg-red-500",
    info: "text-white bg-sky-500",
    warning: "text-white bg-orange-500",
};

/**
 * Inline flash badge (same visual language as the Windows-tree empty-bounds notice).
 * Keep this mounted while `show` toggles so AnimatePresence can play the exit.
 */
export function FlashNotice({ show, kind, className, children }: {
    show: boolean;
    kind: FlashNoticeKind;
    className?: string;
    children: ReactNode;
}) {
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    key={kind}
                    className={cn(
                        "shrink-0 ml-1 px-2 pb-0.5 text-[0.6rem] rounded max-w-72 truncate",
                        kindClasses[kind],
                        className,
                    )}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    role="status"
                    aria-live="polite"
                    title={typeof children === "string" ? children : undefined}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** Loading / error badge driven by caller state (Jotai, Valtio, props). */
export function LoadStatusNotice({ loading, error, loadingLabel = "Loading...", className }: {
    loading: boolean;
    error: string | null | undefined;
    loadingLabel?: string;
    className?: string;
}) {
    const show = loading || Boolean(error);
    const kind: FlashNoticeKind = error ? "error" : "loading";
    const label = error || loadingLabel;

    return (
        <FlashNotice show={show} kind={kind} className={className}>
            {label}
        </FlashNotice>
    );
}
