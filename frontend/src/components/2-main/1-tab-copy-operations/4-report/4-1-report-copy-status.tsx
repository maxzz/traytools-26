import { useEffect, useState } from "react";
import { classNames } from "@/utils/classnames";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { type CopyProgressRow } from "../a-atoms/2-run-copy";

export function OperationStatus({ row }: { row: CopyProgressRow; }) {
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
        <span className="min-w-20 overflow-x-clip inline-grid justify-items-end">
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

function StatusContent({ row }: { row: CopyProgressRow; }) {
    if (row.status === "pending") {
        return (<>
            pending
            <Loader2 className="size-3.5 animate-spin" />
        </>);
    }

    if (row.status === "renamed") {
        return (<>
            renamed
            <Loader2 className="size-3.5 animate-spin" />
        </>);
    }

    if (row.status === "skipped") {
        return (<>
            identical
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" className="inline-flex" aria-label="Skip reason">
                            <Check className="size-3.5" />
                        </button>
                    </TooltipTrigger>

                    <TooltipContent side="left" className="max-w-80">
                        {row.error || SKIPPED_REASON}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </>);
    }

    if (row.status === "copied") {
        return (<>
            copied
            <Check className="size-3.5" />
        </>);
    }

    return (<>
        failed
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button type="button" className="inline-flex" aria-label="Failure details">
                        <AlertCircle className="size-3.5" />
                    </button>
                </TooltipTrigger>

                <TooltipContent side="left" className="max-w-80">
                    <div className="space-y-1">
                        <div>{row.error || "Unknown error"}</div>
                        {row.lockingProcesses && row.lockingProcesses.length > 0 && (
                            <div className="space-y-0.5">
                                <div className="text-muted-foreground">In use by:</div>
                                {row.lockingProcesses.map(
                                    (proc) => (
                                        <div key={`${proc.pid}-${proc.name}`} className="tabular-nums">
                                            {proc.name} (PID {proc.pid})
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </>);
}

const PENDING_STATUS_DELAY_MS = 1500;

const statusToneClass: Record<CopyProgressRow["status"], string> = {
    pending: "text-muted-foreground/50",
    renamed: "text-amber-600 dark:text-amber-400",
    skipped: "text-orange-500/75 dark:text-yellow-400/50",
    copied: "text-emerald-600 dark:text-emerald-400",
    failed: "text-destructive",
};

const SKIPPED_REASON =
    "Destination already exists with the same size and modification time as the source.";
