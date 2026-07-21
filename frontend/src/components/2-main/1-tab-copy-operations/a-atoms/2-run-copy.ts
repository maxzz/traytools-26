import { getDefaultStore } from "jotai";
import { copyOpsBus, onWailsEvent, COPY_OPS_EVENTS, settingsBus, type CopyItemStatusEvent, type CopyJobDoneEvent } from "@/bridge";
import { confirmElevationRestartMessages } from "@/components/4-dialogs/8-1-confirmation/8-confirmation-ui-messages";
import { doAsyncExecuteConfirmDialogAtom } from "@/components/4-dialogs/8-1-confirmation/9-types-confirmation";
import { appIsElevatedAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { type CopyGroup, type CopyOpItem } from "./9-types-copy";
import { copyEditorStore } from "./0-copy-local-storage";

export type CopyProgressRow = {
    sourceFile: string;
    destFolder: string;
    status: "pending" | "skipped" | "copied" | "failed";
    error?: string;
};

export type CopyProgressState = {
    open: boolean;
    running: boolean;
    jobId: string | null;
    setupError: string;
    rows: CopyProgressRow[];
};

type ProgressListener = (state: CopyProgressState) => void;

let progressState: CopyProgressState = {
    open: false,
    running: false,
    jobId: null,
    setupError: "",
    rows: [],
};

const listeners = new Set<ProgressListener>();

export function getCopyProgress(): CopyProgressState {
    return progressState;
}

export function subscribeCopyProgress(listener: ProgressListener): () => void {
    listeners.add(listener);
    listener(progressState);
    return () => { listeners.delete(listener); };
}

function setProgress(next: CopyProgressState) {
    progressState = next;
    for (const listener of listeners) {
        listener(progressState);
    }
}

export function closeCopyProgress() {
    if (progressState.running) {
        return;
    }
    setProgress({ open: false, running: false, jobId: null, setupError: "", rows: [] });
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

function runBatch(items: CopyOpItem[], stopDpAgent: boolean, requireElevated: boolean): void {
    void (async () => {
        if (items.length === 0) {
            copyEditorStore.status = "Nothing to copy";
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
            const nextRows = [...progressState.rows];
            if (nextRows[ev.index]) {
                nextRows[ev.index] = {
                    sourceFile: ev.sourceFile,
                    destFolder: ev.destFolder,
                    status: ev.status,
                    error: ev.error,
                };
            }
            setProgress({ ...progressState, jobId, rows: nextRows, open: true, running: !finished });
        });

        const unsubDone = onWailsEvent<CopyJobDoneEvent>(COPY_OPS_EVENTS.jobDone, (ev) => {
            if (jobId && ev.jobId !== jobId) {
                return;
            }
            jobId = ev.jobId;
            finished = true;
            unsubStatus();
            unsubDone();
            let nextRows = progressState.rows;
            if (ev.error) {
                nextRows = progressState.rows.map((row) =>
                    row.status === "pending"
                        ? { ...row, status: "failed" as const, error: ev.error }
                        : row,
                );
            }
            setProgress({
                ...progressState,
                jobId,
                rows: nextRows,
                running: false,
                open: true,
                setupError: ev.error ?? "",
            });
        });

        setProgress({ open: true, running: true, jobId: null, setupError: "", rows });

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
                setProgress({ open: false, running: false, jobId: null, setupError: "", rows: [] });
                await ensureElevatedOrPrompt(true);
                return;
            }

            if (res.error && !res.jobId) {
                unsubStatus();
                unsubDone();
                setProgress({
                    open: true,
                    running: false,
                    jobId: null,
                    setupError: res.error,
                    rows,
                });
                return;
            }

            jobId = res.jobId;
            if (!finished) {
                setProgress({ ...progressState, jobId, open: true, running: true });
            }
        } catch (e) {
            unsubStatus();
            unsubDone();
            setProgress({
                open: true,
                running: false,
                jobId: null,
                setupError: String(e),
                rows,
            });
        }
    })();
}

/** Copy all items in a group using the group's flags. */
export function runCopyGroup(group: CopyGroup): void {
    runBatch(group.items, !!group.stopDpAgent, !!group.requireElevated);
}

/** Copy a single item using the item's own flags. */
export function runCopyItem(item: CopyOpItem): void {
    runBatch([item], !!item.stopDpAgent, !!item.requireElevated);
}
