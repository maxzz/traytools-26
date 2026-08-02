import { useEffect, useState } from "react";
import { classNames } from "@/utils/classnames";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Equal, HelpCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { type RegProgressRow, type RegRowStatus } from "../a-atoms/2-run-registry";

export function OperationStatus({ row }: { row: RegProgressRow; }) {
    const { status } = row;
    const [pendingVisible, setPendingVisible] = useState(false);

    useEffect(
        () => {
            if (status !== "pending") {
                setPendingVisible(false);
                return;
            }
            setPendingVisible(false);
            const id = setTimeout(() => setPendingVisible(true), PENDING_STATUS_DELAY_MS);
            return () => clearTimeout(id);
        },
        [status]);

    const pendingHidden = status === "pending" && !pendingVisible;

    return (
        <span className="min-w-20 inline-grid justify-items-end overflow-x-clip">
            <AnimatePresence initial={false}>
                <motion.span
                    key={status}
                    className={classNames("col-start-1 row-start-1 inline-flex items-center gap-1 justify-end", statusToneClass[status])}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: pendingHidden ? 0 : 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    aria-hidden={pendingHidden}
                >
                    <StatusContent row={row} />
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

function StatusContent({ row }: { row: RegProgressRow; }) {
    switch (row.status) {
        case "pending":
            return (<>
                pending
                <Loader2 className="size-3.5 animate-spin" />
            </>);

        case "read":
            return (<>
                read
                <Check className="size-3.5" />
            </>);

        case "missing":
            return (<>
                not set
                <StatusTooltip label="Value state">
                    This value does not exist yet. Writing will create the key and value.
                </StatusTooltip>
            </>);

        case "written":
            return (<>
                written
                <Check className="size-3.5" />
            </>);

        case "unchanged":
            return (<>
                unchanged
                <StatusTooltip label="Value state" icon={<Equal className="size-3.5" />}>
                    The registry already held this exact value and type, so nothing was written.
                </StatusTooltip>
            </>);

        case "failed":
            return (<>
                failed
                <StatusTooltip label="Failure details" icon={<AlertCircle className="size-3.5" />}>
                    {row.error || "Unknown error"}
                </StatusTooltip>
            </>);
    }
}

function StatusTooltip({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode; }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button type="button" className="inline-flex" aria-label={label}>
                        {icon ?? <HelpCircle className="size-3.5" />}
                    </button>
                </TooltipTrigger>

                <TooltipContent side="left" className="max-w-80">
                    {children}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

const PENDING_STATUS_DELAY_MS = 1500;

const statusToneClass: Record<RegRowStatus, string> = {
    pending: "text-muted-foreground/50",
    read: "text-sky-600 dark:text-sky-400",
    missing: "text-orange-500/75 dark:text-yellow-400/50",
    written: "text-emerald-600 dark:text-emerald-400",
    unchanged: "text-orange-500/75 dark:text-yellow-400/50",
    failed: "text-destructive",
};
