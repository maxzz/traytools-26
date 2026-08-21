import { type ReactNode } from "react";
import { cn } from "@/utils/classnames";
import { AnimatePresence, motion } from "motion/react";

export type StatusLineKind = "idle" | "loading" | "error";

const kindClasses: Record<StatusLineKind, string> = {
    idle: "text-muted-foreground",
    loading: "text-muted-foreground",
    error: "text-destructive",
};

/**
 * Status-line text with a Motion crossfade. Embed in a footer/status bar;
 * keep the parent mounted so exit animations can play.
 */
export function StatusLineNotice({ kind, className, children }: {
    kind: StatusLineKind;
    className?: string;
    children: ReactNode;
}) {
    return (
        <motion.span
            className={cn("min-w-0 truncate", kindClasses[kind], className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="status"
            aria-live="polite"
            title={typeof children === "string" ? children : undefined}
        >
            {children}
        </motion.span>
    );
}

/** Loading / error / idle label driven by caller state (Jotai, Valtio, props). */
export function LoadStatusNotice({
    loading,
    error,
    loadingLabel = "Loading...",
    idleLabel = "Ready",
    className,
}: {
    loading: boolean;
    error: string | null | undefined;
    loadingLabel?: string;
    idleLabel?: string;
    className?: string;
}) {
    const kind: StatusLineKind = error ? "error" : loading ? "loading" : "idle";
    const label = error || (loading ? loadingLabel : idleLabel);

    return (
        <AnimatePresence initial={false} mode="wait">
            <StatusLineNotice key={kind} kind={kind} className={className}>
                {label}
            </StatusLineNotice>
        </AnimatePresence>
    );
}
