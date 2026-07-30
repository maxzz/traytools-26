import { proxy } from "valtio";
import { atom, getDefaultStore } from "jotai";
import {
    syncOpsBus,
    onWailsEvent,
    SYNC_OPS_EVENTS,
    type SyncCheckResponse,
    type SyncJobDoneEvent,
    type SyncProgressEvent,
} from "@/bridge";
import { appSettings } from "@/store/1-ui-settings";
import { notice } from "@/ui/local-ui/7-toaster";
import { type SyncOpItem, itemLabel } from "./9-types-sync";

export type SyncJobKind = "sync" | "check" | "check-details";

export type SyncJobReport = {
    /** Local identity for this UI job (stable for the session). */
    uid: string;
    /** Backend job id once known (sync jobs). */
    jobId: string | null;
    startedAt: number;
    label: string;
    kind: SyncJobKind;
    running: boolean;
    setupError: string;
    messages: string[];
    summary: string;
    /** Full check payload when Check Details is shown in the bottom panel. */
    checkDetails?: SyncCheckResponse;
};

type SyncReportStore = {
    jobs: SyncJobReport[];
};

let jobUidCounter = 0;

function newJobUid(): string {
    jobUidCounter += 1;
    return `sync-job-${jobUidCounter}`;
}

export const syncReportStore = proxy<SyncReportStore>({
    jobs: [],
});

export type CheckDetailsDialogPayload = {
    label: string;
    response: SyncCheckResponse;
};

/** Jotai: open Check Details dialog with payload, or null when closed. */
export const checkDetailsDialogAtom = atom<CheckDetailsDialogPayload | null>(null);

export function clearSyncReportMessages(): void {
    if (syncReportStore.jobs.some((job) => job.running)) {
        return;
    }
    syncReportStore.jobs = [];
}

function findJob(uid: string): SyncJobReport | undefined {
    return syncReportStore.jobs.find((job) => job.uid === uid);
}

function appendJob(job: SyncJobReport): void {
    syncReportStore.jobs.push(job);
}

function pathsReady(source: string, dest: string): boolean {
    return !!source.trim() && !!dest.trim();
}

/** Sync a single folder pair; direction reverse swaps source ↔ dest. */
export function runSyncItem(item: SyncOpItem, direction: "forward" | "reverse" = "forward"): void {
    const sourceFolder = direction === "forward" ? item.sourceFolder : item.destFolder;
    const destFolder = direction === "forward" ? item.destFolder : item.sourceFolder;
    if (!pathsReady(sourceFolder, destFolder)) {
        notice.warning("Set source and destination folders first");
        return;
    }

    const arrow = direction === "forward" ? "→" : "←";
    const label = `${itemLabel(item)} ${arrow}`;

    void (async () => {
        const uid = newJobUid();
        const job: SyncJobReport = {
            uid,
            jobId: null,
            startedAt: Date.now(),
            label,
            kind: "sync",
            running: true,
            setupError: "",
            messages: [],
            summary: "",
        };
        appendJob(job);

        // Subscribe before starting the job so early EventsEmit cannot be missed.
        let jobId: string | null = null;
        let finished = false;

        const unsubProgress = onWailsEvent<SyncProgressEvent>(SYNC_OPS_EVENTS.progress, (ev) => {
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
            live.jobId = jobId;
            if (ev.message?.trim()) {
                live.messages.push(ev.message.trim());
            }
            live.running = !finished;
        });

        const unsubDone = onWailsEvent<SyncJobDoneEvent>(SYNC_OPS_EVENTS.jobDone, (ev) => {
            if (jobId && ev.jobId !== jobId) {
                return;
            }
            jobId = ev.jobId;
            finished = true;
            unsubProgress();
            unsubDone();
            const live = findJob(uid);
            if (!live) {
                return;
            }
            live.jobId = jobId;
            live.running = false;
            if (ev.error) {
                live.setupError = ev.error;
                return;
            }
            const changeCount = ev.changeCount ?? ev.changes?.length ?? 0;
            const fileCount = ev.sourceFileCount ?? 0;
            live.summary = changeCount === 0
                ? `Synced — identical (${fileCount} files)`
                : `Synced — ${changeCount} update${changeCount === 1 ? "" : "s"} (${fileCount} files)`;
        });

        try {
            const res = await syncOpsBus.sync({ sourceFolder, destFolder });
            if (res.error && !res.jobId) {
                unsubProgress();
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
            unsubProgress();
            unsubDone();
            const live = findJob(uid);
            if (live) {
                live.running = false;
                live.setupError = String(e);
            }
        }
    })();
}

/** Quick check — append a one-line summary to the report panel. */
export function runCheckItem(item: SyncOpItem): void {
    const { sourceFolder, destFolder } = item;
    if (!pathsReady(sourceFolder, destFolder)) {
        notice.warning("Set source and destination folders first");
        return;
    }

    const label = `Check · ${itemLabel(item)}`;

    void (async () => {
        const uid = newJobUid();
        appendJob({
            uid,
            jobId: null,
            startedAt: Date.now(),
            label,
            kind: "check",
            running: true,
            setupError: "",
            messages: [],
            summary: "",
        });

        try {
            const res = await syncOpsBus.check({ sourceFolder, destFolder });
            const live = findJob(uid);
            if (!live) {
                return;
            }
            live.running = false;
            if (res.identical) {
                live.summary = `Identical — ${res.sourceFileCount} files in ${res.folderCount} folders`;
            } else {
                live.summary = `${res.changeCount} update${res.changeCount === 1 ? "" : "s"} — ${res.sourceFileCount} files in ${res.folderCount} folders`;
            }
        } catch (e) {
            const live = findJob(uid);
            if (live) {
                live.running = false;
                live.setupError = String(e);
            }
        }
    })();
}

/**
 * Check Details — dialog by default, or bottom panel when
 * appSettings.syncCheckDetailsInPanel is true.
 */
export function runCheckDetails(item: SyncOpItem): void {
    const { sourceFolder, destFolder } = item;
    if (!pathsReady(sourceFolder, destFolder)) {
        notice.warning("Set source and destination folders first");
        return;
    }

    const label = `Check Details · ${itemLabel(item)}`;
    const inPanel = appSettings.syncCheckDetailsInPanel === true;

    void (async () => {
        const uid = newJobUid();
        if (inPanel) {
            appendJob({
                uid,
                jobId: null,
                startedAt: Date.now(),
                label,
                kind: "check-details",
                running: true,
                setupError: "",
                messages: [],
                summary: "",
            });
        }

        try {
            const res = await syncOpsBus.check({ sourceFolder, destFolder });
            if (inPanel) {
                const live = findJob(uid);
                if (!live) {
                    return;
                }
                live.running = false;
                live.checkDetails = res;
                live.summary = res.identical
                    ? `Identical — ${res.sourceFileCount} files`
                    : `${res.changeCount} update${res.changeCount === 1 ? "" : "s"}`;
                return;
            }
            getDefaultStore().set(checkDetailsDialogAtom, { label, response: res });
        } catch (e) {
            if (inPanel) {
                const live = findJob(uid);
                if (live) {
                    live.running = false;
                    live.setupError = String(e);
                }
                return;
            }
            notice.error(`Check Details failed:<br/>${String(e)}`);
        }
    })();
}
