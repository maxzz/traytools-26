import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { IconTrash24 } from "@/ui/icons/normal";
import { Button } from "@/ui/shadcn/button";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { type SyncJobReport, clearSyncReportMessages, syncReportStore } from "../../a-atoms/2-run-sync";
import { CheckDetailsTree } from "./4-1-check-details-tree";

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

function JobBlock({ job }: { job: SyncJobReport; }) {
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

            {job.messages.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                    {job.messages.map(
                        (msg, i) => (
                            <div key={i} className="truncate" title={msg}>{msg}</div>
                        )
                    )}
                </div>
            )}

            {job.summary && (
                <p className="text-xs">{job.summary}</p>
            )}

            {job.kind === "check-details" && job.checkDetails && (
                <div className="pt-1">
                    <CheckDetailsTree response={job.checkDetails} />
                </div>
            )}
        </section>
    );
}

const NEAR_BOTTOM_PX = 48;
const RUNNING_INDICATOR_DELAY_MS = 2000;

/** Shows only after a delay so short-lived jobs never flash "running". */
function DelayedRunningIndicator({ running }: { running: boolean; }) {
    const [show, setShow] = useState(false);

    useEffect(
        () => {
            if (!running) {
                setShow(false);
                return;
            }
            const id = setTimeout(() => setShow(true), RUNNING_INDICATOR_DELAY_MS);
            return () => clearTimeout(id);
        },
        [running]
    );

    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.span
                    className="shrink-0 text-muted-foreground inline-flex items-center gap-1 overflow-hidden"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                    <Loader2 className="size-3 animate-spin" />
                    running
                </motion.span>
            )}
        </AnimatePresence>
    );
}

function formatJobTime(startedAt: number): string {
    return new Date(startedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    });
}
