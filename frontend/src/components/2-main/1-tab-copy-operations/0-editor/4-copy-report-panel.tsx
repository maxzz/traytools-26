import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { AlertCircle, Check, Loader2, Minus } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { clearCopyReportMessages, copyReportStore, type CopyJobReport, type CopyProgressRow } from "../a-atoms/2-run-copy";
import { itemLabel } from "../a-atoms/9-types-copy";

const NEAR_BOTTOM_PX = 48;

function formatJobTime(startedAt: number): string {
    return new Date(startedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function CopyReportPanel() {
    const snap = useSnapshot(copyReportStore);
    const viewportRef = useRef<HTMLDivElement>(null);
    const stickToBottomRef = useRef(true);
    const anyRunning = snap.jobs.some((job) => job.running);
    const hasJobs = snap.jobs.length > 0;

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) {
            return;
        }
        const onScroll = () => {
            stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [hasJobs]);

    useLayoutEffect(() => {
        const el = viewportRef.current;
        if (!el || !stickToBottomRef.current) {
            return;
        }
        el.scrollTop = el.scrollHeight;
    });

    return (
        <div className="size-full min-h-0 flex flex-col">
            <div className="px-2 py-1.5 border-b flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold truncate">
                    Copy report
                </span>

                <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="ml-auto"
                    disabled={anyRunning || !hasJobs}
                    onClick={clearCopyReportMessages}
                >
                    Clear All Messages
                </Button>
            </div>

            <ScrollArea2 ref={viewportRef} className="flex-1 min-h-0">
                {!hasJobs
                    ? (
                        <div className="p-3 text-xs text-muted-foreground">
                            Copy results will appear here.
                        </div>
                    )
                    : (
                        <div className="p-2 space-y-3 text-sm">
                            {snap.jobs.map((job) => (
                                <JobGroup key={job.uid} job={job as CopyJobReport} />
                            ))}
                        </div>
                    )}
            </ScrollArea2>
        </div>
    );
}

function JobGroup({ job }: { job: CopyJobReport; }) {
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

            <div className="pr-1 text-xs grid grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5">
                {job.rows.map((row, i) => (
                    <Fragment key={i}>
                        <ReportRow row={row} />
                    </Fragment>
                ))}
            </div>
        </section>
    );
}

function ReportRow({ row }: { row: CopyProgressRow; }) {
    const name = itemLabel({ sourceFile: row.sourceFile });
    return (<>
        <span className="truncate" title={row.sourceFile}>
            {name}
        </span>
        <span className="text-muted-foreground truncate" title={row.destFolder}>
            {row.destFolder || "—"}
        </span>
        <StatusBadge row={row} />
    </>);
}

function StatusBadge({ row }: { row: CopyProgressRow; }) {
    if (row.status === "pending") {
        return (
            <span className="min-w-20 text-muted-foreground inline-flex items-center gap-1 justify-end">
                <Loader2 className="size-3.5 animate-spin" />
                pending
            </span>
        );
    }

    if (row.status === "skipped") {
        return (
            <span className="min-w-20 text-muted-foreground inline-flex items-center gap-1 justify-end">
                <Minus className="size-3.5" />
                skipped
            </span>
        );
    }

    if (row.status === "copied") {
        return (
            <span className={cn("min-w-20 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 justify-end")}>
                <Check className="size-3.5" />
                copied
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
