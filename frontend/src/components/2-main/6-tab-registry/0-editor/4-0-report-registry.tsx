import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { IconTrash24 } from "@/ui/icons/normal";
import { Button } from "@/ui/shadcn/button";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { DelayedRunningIndicator } from "../../a-shared/delayed-running-indicator";
import { formatJobTime } from "../../a-shared/format-job-time";
import { type RegJobReport, type RegProgressRow, clearRegistryReportMessages, registryReportStore } from "../a-atoms/2-run-registry";
import { OperationStatus } from "./4-1-report-status";

export function RegistryReportPanel() {
    const { jobs } = useSnapshot(registryReportStore);
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
                onClick={clearRegistryReportMessages}
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
                                    <JobGroupHeader key={job.uid} job={job as RegJobReport} />
                                )
                            )}
                        </div>
                    )}
            </ScrollArea2>
        </div>
    );
}

function JobGroupHeader({ job }: { job: RegJobReport; }) {
    return (
        <section className="space-y-1.5">
            <header className="text-xs flex items-baseline gap-2">
                <span className="font-semibold tabular-nums">
                    {formatJobTime(job.startedAt)}
                </span>

                <span className="text-muted-foreground/70">
                    {job.kind === "read" ? "read" : "write"}
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
                        <ReportRow key={i} row={row} />
                    )
                )}
            </div>
        </section>
    );
}

function ReportRow({ row }: { row: RegProgressRow; }) {
    return (<>
        <OperationStatus row={row} />

        <span className="truncate" title={`${row.keyPath}\n${row.valueName} (${row.valueType})`}>
            {row.label}
        </span>

        <span className="text-muted-foreground truncate" title={rowDetailTitle(row)}>
            {rowDetail(row)}
        </span>
    </>);
}

/** Right column: what the operation produced, falling back to the target key. */
function rowDetail(row: RegProgressRow): string {
    if (row.status === "failed") {
        return row.error || row.keyPath;
    }
    if (row.status === "missing" || row.status === "pending") {
        return row.keyPath;
    }
    return row.value ? oneLine(row.value) : row.keyPath;
}

function rowDetailTitle(row: RegProgressRow): string {
    const lines = [`${row.keyPath}\\${row.valueName}`, `Type: ${row.valueType}`];
    if (row.value !== undefined) {
        lines.push(`Value: ${row.value}`);
    }
    if (row.previousValue !== undefined && row.previousValue !== row.value) {
        lines.push(`Previous: ${row.previousValue}`);
    }
    if (row.error) {
        lines.push(row.error);
    }
    return lines.join("\n");
}

/** Multi-string and binary values can be long; keep report rows single-line. */
function oneLine(value: string): string {
    const flat = value.replace(/\s*\n\s*/g, " · ");
    return flat.length > 120 ? `${flat.slice(0, 120)}…` : flat;
}

const NEAR_BOTTOM_PX = 48;
