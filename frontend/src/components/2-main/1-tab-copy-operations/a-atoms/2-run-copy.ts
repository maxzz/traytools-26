import { proxy } from "valtio";
import { getDefaultStore } from "jotai";
import { copyOpsBus, onWailsEvent, COPY_OPS_EVENTS, settingsBus, type CopyItemStatusEvent, type CopyJobDoneEvent } from "@/bridge";
import { confirmElevationRestartMessages } from "@/components/4-dialogs/8-1-confirmation/8-confirmation-ui-messages";
import { doAsyncExecuteConfirmDialogAtom } from "@/components/4-dialogs/8-1-confirmation/9-types-confirmation";
import { appIsElevatedAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { notice } from "@/ui/local-ui/7-toaster";
import { type CopyGroup, type CopyOpItem, itemLabel } from "./9-types-copy";
import { copyEditorStore } from "./0-copy-local-storage";

export type CopyProgressRow = {
    sourceFile: string;
    destFolder: string;
    status: "pending" | "skipped" | "copied" | "failed";
    error?: string;
};

export type CopyJobReport = {
    /** Local identity for this UI job (stable for the session). */
    uid: string;
    /** Backend job id once known. */
    jobId: string | null;
    startedAt: number;
    label: string;
    running: boolean;
    setupError: string;
    rows: CopyProgressRow[];
};

type CopyReportStore = {
    jobs: CopyJobReport[];
};

let jobUidCounter = 0;

function newJobUid(): string {
    jobUidCounter += 1;
    return `job-${jobUidCounter}`;
}

export const copyReportStore = proxy<CopyReportStore>({
    jobs: [],
});

export function clearCopyReportMessages(): void {
    if (copyReportStore.jobs.some((job) => job.running)) {
        return;
    }
    copyReportStore.jobs = [];
}

function findJob(uid: string): CopyJobReport | undefined {
    return copyReportStore.jobs.find((job) => job.uid === uid);
}

async function ensureElevatedOrPrompt(requireElevated: boolean): Promise<boolean> {
    if (!requireElevated) {
        return true;
    }
    const store = getDefaultStore();
    let elevated = store.get(appIsElevatedAtom);
    if (elevated === null) {
        try {
            elevated = await settingsBus.isElevated();
            store.set(appIsElevatedAtom, elevated);
        } catch {
            elevated = false;
        }
    }
    if (elevated) {
        return true;
    }
    const ok = await store.set(doAsyncExecuteConfirmDialogAtom, confirmElevationRestartMessages);
    if (ok) {
        try {
            await settingsBus.requestElevationRestart();
        } catch (e) {
            copyEditorStore.error = `Failed to relaunch elevated: ${String(e)}`;
        }
    }
    return false;
}

function removeJob(uid: string): void {
    copyReportStore.jobs = copyReportStore.jobs.filter((job) => job.uid !== uid);
}

function runBatch(items: CopyOpItem[], stopDpAgent: boolean, requireElevated: boolean, label: string): void {
    void (async () => {
        if (items.length === 0) {
            notice.warning("Nothing to copy");
            return;
        }

        if (!(await ensureElevatedOrPrompt(requireElevated))) {
            return;
        }

        const rows: CopyProgressRow[] = items.map((item) => ({
            sourceFile: item.sourceFile,
            destFolder: item.destFolder,
            status: "pending",
        }));

        const uid = newJobUid();
        const job: CopyJobReport = {
            uid,
            jobId: null,
            startedAt: Date.now(),
            label,
            running: true,
            setupError: "",
            rows,
        };
        copyReportStore.jobs.push(job);

        // Subscribe before starting the job so early EventsEmit cannot be missed.
        let jobId: string | null = null;
        let finished = false;

        const unsubStatus = onWailsEvent<CopyItemStatusEvent>(COPY_OPS_EVENTS.itemStatus, (ev) => {
            if (jobId && ev.jobId !== jobId) {
                return;
            }
            if (!jobId) {
                jobId = ev.jobId;
            }
            const live = findJob(uid);
            if (!live) {
                return;
            }
            if (live.rows[ev.index]) {
                live.rows[ev.index] = {
                    sourceFile: ev.sourceFile,
                    destFolder: ev.destFolder,
                    status: ev.status,
                    error: ev.error,
                };
            }
            live.jobId = jobId;
            live.running = !finished;
        });

        const unsubDone = onWailsEvent<CopyJobDoneEvent>(COPY_OPS_EVENTS.jobDone, (ev) => {
            if (jobId && ev.jobId !== jobId) {
                return;
            }
            jobId = ev.jobId;
            finished = true;
            unsubStatus();
            unsubDone();
            const live = findJob(uid);
            if (!live) {
                return;
            }
            if (ev.error) {
                live.rows = live.rows.map((row) =>
                    row.status === "pending"
                        ? { ...row, status: "failed" as const, error: ev.error }
                        : row,
                );
                live.setupError = ev.error;
            }
            live.jobId = jobId;
            live.running = false;
        });

        try {
            const res = await copyOpsBus.copyBatch({
                stopDpAgent,
                requireElevated,
                items: items.map((item) => ({
                    sourceFile: item.sourceFile,
                    destFolder: item.destFolder,
                })),
            });

            if (res.needsElevation) {
                unsubStatus();
                unsubDone();
                removeJob(uid);
                await ensureElevatedOrPrompt(true);
                return;
            }

            if (res.error && !res.jobId) {
                unsubStatus();
                unsubDone();
                const live = findJob(uid);
                if (live) {
                    live.running = false;
                    live.setupError = res.error;
                }
                return;
            }

            jobId = res.jobId;
            const live = findJob(uid);
            if (live && !finished) {
                live.jobId = jobId;
                live.running = true;
            }
        } catch (e) {
            unsubStatus();
            unsubDone();
            const live = findJob(uid);
            if (live) {
                live.running = false;
                live.setupError = String(e);
            }
        }
    })();
}

/** Copy all items in a group using the group's flags. */
export function runCopyGroup(group: CopyGroup): void {
    runBatch(group.items, !!group.stopDpAgent, !!group.requireElevated, group.name || "Group");
}

/** Copy a single item using the item's own flags. */
export function runCopyItem(item: CopyOpItem): void {
    runBatch([item], !!item.stopDpAgent, !!item.requireElevated, itemLabel(item));
}
