import { useEffect, useLayoutEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { IconTrash24 } from "@/ui/icons/normal";
import { Button } from "@/ui/shadcn/button";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { DelayedRunningIndicator } from "../../../a-shared/delayed-running-indicator";
import { formatJobTime } from "../../../a-shared/format-job-time";
import { type SyncJobReport, clearSyncReportMessages, syncReportStore } from "../../a-atoms/2-run-sync";
import { CheckDetailsTree, JobFooter } from "./4-1-check-details-tree";

export function SyncReportPanel() {
    const { jobs } = useSnapshot(syncReportStore);
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
                onClick={clearSyncReportMessages}
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
                                    <JobBlock key={job.uid} job={job as SyncJobReport} />
                                )
                            )}
                        </div>
                    )}
            </ScrollArea2>
        </div>
    );
}

const NEAR_BOTTOM_PX = 48;

function JobBlock({ job }: { job: SyncJobReport; }) {
    return (
        <section className="space-y-1.5">
            <JobHeader job={job} />

            {job.setupError && (
                <p className="text-xs text-destructive">{job.setupError}</p>
            )}

            {job.messages.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                    {job.messages.map(
                        (msg, i) => (
                            <div key={i} className="truncate" title={msg}>
                                {msg}
                            </div>
                        )
                    )}
                </div>
            )}

            {job.summary && (
                <p className="text-xs">
                    {job.summary}
                </p>
            )}

            {job.kind === "check-details" && job.checkDetails && (
                <div className="pt-1">
                    <div className="mb-1.5 text-xs text-sky-600 dark:text-cyan-400">Check</div>
                    <CheckDetailsTree response={job.checkDetails} />
                    <JobFooter response={job.checkDetails} />
                </div>
            )}
        </section>
    );
}

function JobHeader({ job }: { job: SyncJobReport; }) {
    return (
        <header className="text-xs flex items-baseline gap-2">
            <span className="font-semibold tabular-nums">
                {formatJobTime(job.startedAt)}
            </span>

            <span className="text-muted-foreground truncate" title={job.label}>
                {job.label}
            </span>

            <DelayedRunningIndicator running={job.running} />
        </header>
    );
}

