import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { IconTrash24 } from "@/ui/icons/normal";
import { Button } from "@/ui/shadcn/button";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { DelayedRunningIndicator } from "../../../a-shared/utils-delayed-running-indicator";
import { formatJobTime } from "../../../a-shared/report-format-job-time";
import { type CopyJobReport, type CopyProgressRow, clearCopyReportMessages, copyReportStore } from "../../a-atoms/2-run-copy";
import { itemLabel, sourceFileBaseName } from "../../a-atoms/9-types-copy";
import { OperationStatus } from "./4-1-report-copy-status";

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
                        <div className="p-3 text-xs text-muted-foreground" />
                    )
                    : (
                        <div className="p-2 text-sm space-y-3">
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
            <header className="text-xs flex items-baseline gap-2">
                <span className="font-semibold tabular-nums">
                    {formatJobTime(job.startedAt)}
                </span>

                <span className="text-muted-foreground truncate" title={job.label}>
                    {job.label}
                </span>

                <DelayedRunningIndicator running={job.running} />
            </header>

            {job.setupError && (
                <p className="text-xs text-destructive">{job.setupError}</p>
            )}

            <div className="pr-1 text-xs grid grid-cols-[auto_minmax(0,auto)_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5">
                {job.rows.map(
                    (row, i) => (
                        <Fragment key={i}>
                            <ReportRow row={row} />
                            {row.lockingProcesses?.map(
                                (proc) => (
                                    <Fragment key={`${proc.pid}-${proc.name}`}>
                                        <span aria-hidden className="min-w-20" />
                                        <span className="pl-1 text-muted-foreground truncate col-span-2" title={`${proc.name} (PID ${proc.pid})`}>
                                            {proc.name}
                                            {" "}
                                            <span className="tabular-nums">(PID {proc.pid})</span>
                                        </span>
                                    </Fragment>
                                )
                            )}
                        </Fragment>
                    )
                )}
            </div>
        </section>
    );
}

function ReportRow({ row }: { row: CopyProgressRow; }) {
    const name = itemLabel({ sourceFile: row.sourceFile });
    const lockedName = row.lockedRenamedTo ? sourceFileBaseName(row.lockedRenamedTo) : "";
    const destTitle = lockedName
        ? `${row.destFolder || "No destination folder"}\nLocked file renamed to ${lockedName}`
        : (row.destFolder || "No destination folder");
    return (<>
        <OperationStatus row={row} />

        <span className="truncate" title={row.sourceFile}>
            {name}
        </span>

        <span className="text-muted-foreground truncate" title={destTitle}>
            {row.destFolder || "No destination folder"}
            {lockedName && (
                <span className="text-amber-600/90 dark:text-amber-400/80">
                    {" · locked → "}
                    {lockedName}
                </span>
            )}
        </span>
    </>);
}

const NEAR_BOTTOM_PX = 48;
