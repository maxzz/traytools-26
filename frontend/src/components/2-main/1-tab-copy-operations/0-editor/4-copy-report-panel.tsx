import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { IconTrash24 } from "@/ui/icons/normal";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { type CopyJobReport, type CopyProgressRow, clearCopyReportMessages, copyReportStore } from "../a-atoms/2-run-copy";
import { itemLabel } from "../a-atoms/9-types-copy";

export function CopyReportPanel() {
    const { jobs } = useSnapshot(copyReportStore);
    const viewportRef = useRef<HTMLDivElement>(null);
    const stickToBottomRef = useRef(true);
    const anyRunning = jobs.some((job) => job.running);
    const hasJobs = jobs.length > 0;

    useEffect(
        () => {
            const el = viewportRef.current;
            if (!el) {
                return;
            }
            const onScroll = () => {
                stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
            };
            el.addEventListener("scroll", onScroll, { passive: true });
            return () => el.removeEventListener("scroll", onScroll);
        },
        [hasJobs]);

    useLayoutEffect(
        () => {
            const el = viewportRef.current;
            if (!el || !stickToBottomRef.current) {
                return;
            }
            el.scrollTop = el.scrollHeight;
        }
    );

    return (
        <div className="relative size-full min-h-0 flex flex-col">
            <Button
                className="absolute top-1 right-1 z-10"
                onClick={clearCopyReportMessages}
                title="Clear all messages"
                type="button"
                size="xs"
                variant="ghost"
                disabled={anyRunning || !hasJobs}
            >
                <IconTrash24 className="size-3.5" />
            </Button>

            <ScrollArea2 ref={viewportRef} className="flex-1 min-h-0">
                {!hasJobs
                    ? (
                        <div className="p-3 text-xs text-muted-foreground">
                        </div>
                    )
                    : (
                        <div className="p-2 space-y-3 text-sm">
                            {jobs.map(
                                (job) => (
                                    <JobGroupHeader key={job.uid} job={job as CopyJobReport} />
                                )
                            )}
                        </div>
                    )}
            </ScrollArea2>
        </div>
    );
}

function JobGroupHeader({ job }: { job: CopyJobReport; }) {
    return (
        <section className="space-y-1.5">
            <header className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold tabular-nums">
                    {formatJobTime(job.startedAt)}
                </span>

                <span className="text-muted-foreground truncate" title={job.label}>
                    {job.label}
                </span>

                {job.running && (
                    <span className="text-muted-foreground inline-flex items-center gap-1 shrink-0">
                        <Loader2 className="size-3 animate-spin" />
                        running
                    </span>
                )}
            </header>

            {job.setupError && (
                <p className="text-xs text-destructive">{job.setupError}</p>
            )}

            <div className="pr-1 text-xs grid grid-cols-[auto_minmax(0,auto)_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5">
                {job.rows.map(
                    (row, i) => (
                        <Fragment key={i}>
                            <ReportRow row={row} />
                        </Fragment>
                    )
                )}
            </div>
        </section>
    );
}

function ReportRow({ row }: { row: CopyProgressRow; }) {
    const name = itemLabel({ sourceFile: row.sourceFile });
    return (<>
        <OperationStatus row={row} />

        <span className="truncate" title={row.sourceFile}>
            {name}
        </span>

        <span className="text-muted-foreground truncate" title={row.destFolder}>
            {row.destFolder || "No destination folder"}
        </span>
    </>);
}

function OperationStatus({ row }: { row: CopyProgressRow; }) {
    if (row.status === "pending") {
        return (
            <span className="min-w-20 text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 justify-end">
                pending
                <Loader2 className="size-3.5 animate-spin" />
            </span>
        );
    }

    if (row.status === "skipped") {
        return (
            <span className="min-w-20 text-orange-500/75 dark:text-yellow-400/50 inline-flex items-center gap-1 justify-end">
                skipped
                <div className="size-3.5"></div>
            </span>
        );
    }

    if (row.status === "copied") {
        return (
            <span className={cn("min-w-20 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 justify-end")}>
                copied
                <Check className="size-3.5" />
            </span>
        );
    }

    return (
        <span className="min-w-20 text-destructive inline-flex items-center gap-1 justify-end">
            failed
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" className="inline-flex" aria-label="Failure details">
                            <AlertCircle className="size-3.5" />
                        </button>
                    </TooltipTrigger>

                    <TooltipContent side="left" className="max-w-80">
                        {row.error || "Unknown error"}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </span>
    );
}

const NEAR_BOTTOM_PX = 48;

function formatJobTime(startedAt: number): string {
    return new Date(startedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    });
}
