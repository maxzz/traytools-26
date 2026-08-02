import { proxy } from "valtio";
import { atom, getDefaultStore } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { type RegReadResult, type RegValueSpec, type RegValueType, registryOpsBus, settingsBus } from "@/bridge";
import { resolveDirtyTabsBeforeDestructiveAction } from "@/components/0-all/a-quit-unsaved";
import {
    confirmRegistryElevationRestartMessages,
    getConfirmRegistryWriteMessages,
} from "@/components/4-dialogs/8-1-confirmation/8-confirmation-ui-messages";
import { doAsyncExecuteConfirmDialogAtom } from "@/components/4-dialogs/8-1-confirmation/9-types-confirmation";
import { appIsElevatedAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { notice } from "@/ui/local-ui/7-toaster";
import {
    type RegGroup,
    type RegItem,
    collectGroupItems,
    findByUid,
    fullKeyPath,
    hiveNeedsElevation,
    itemLabel,
    valueDisplayName,
} from "./9-types-registry";
import { registryEditorStore } from "./0-registry-local-storage";

// ---------------------------------------------------------------------------
// Last-read values
//
// Read results are transient: they describe the machine right now, not the
// configuration, so they live outside the editor tree and are never persisted.

export type RegReadState = {
    at: number;
    loading: boolean;
    exists: boolean;
    valueType?: RegValueType;
    value?: string;
    error?: string;
};

export const registryReadStore = proxy<{ byUid: Record<string, RegReadState>; }>({
    byUid: {},
});

export function clearRegistryReads(): void {
    registryReadStore.byUid = {};
}

/** True when the value on the machine already equals what the item would write. */
export function readMatchesDesired(read: RegReadState | undefined, item: Pick<RegItem, "valueType" | "newValue">): boolean {
    return !!read && !read.loading && read.exists && read.valueType === item.valueType && read.value === item.newValue;
}

// ---------------------------------------------------------------------------
// Report

export type RegRowStatus = "pending" | "read" | "missing" | "written" | "unchanged" | "failed";

export type RegProgressRow = {
    uid?: string;
    label: string;
    /** Full HIVE\subkey path, for display. */
    keyPath: string;
    valueName: string;
    valueType: RegValueType;
    status: RegRowStatus;
    /** Value read from the registry, or written to it. */
    value?: string;
    /** Value replaced by a write, when one existed. */
    previousValue?: string;
    error?: string;
};

export type RegJobReport = {
    /** Local identity for this UI job (stable for the session). */
    uid: string;
    kind: "read" | "write";
    startedAt: number;
    label: string;
    running: boolean;
    setupError: string;
    rows: RegProgressRow[];
};

export const registryReportStore = proxy<{ jobs: RegJobReport[]; }>({
    jobs: [],
});

export function clearRegistryReportMessages(): void {
    if (registryReportStore.jobs.some((job) => job.running)) {
        return;
    }
    registryReportStore.jobs = [];
}

let jobUidCounter = 0;

function newJobUid(): string {
    jobUidCounter += 1;
    return `regjob-${jobUidCounter}`;
}

function findJob(uid: string): RegJobReport | undefined {
    return registryReportStore.jobs.find((job) => job.uid === uid);
}

// ---------------------------------------------------------------------------
// Preferences

/**
 * Ask before every write. Registry edits are hard to undo, so this is on by
 * default. getOnInit is set because the runners read it through store.get()
 * outside React; without it an opt-out would be ignored until the checkbox in
 * the root props pane had been mounted at least once.
 */
export const confirmRegistryWritesAtom = atomWithStorage("reg.confirmWrites", true, undefined, { getOnInit: true });

// ---------------------------------------------------------------------------
// Helpers

function toSpec(item: RegItem): RegValueSpec {
    return {
        hive: item.hive,
        keyPath: item.keyPath,
        valueName: item.valueName,
        valueType: item.valueType,
        value: item.newValue,
        view: item.view,
    };
}

function newRow(item: RegItem): RegProgressRow {
    return {
        uid: item.uid,
        label: itemLabel(item),
        keyPath: fullKeyPath(item),
        valueName: valueDisplayName(item.valueName),
        valueType: item.valueType,
        status: "pending",
    };
}

/**
 * Split items into those that can be sent to the backend and those that are
 * incomplete. An empty key path would resolve to the hive root, so it is
 * rejected here rather than silently writing somewhere unexpected.
 */
function partitionRunnable(items: RegItem[]): { runnable: RegItem[]; invalid: RegItem[]; } {
    const runnable: RegItem[] = [];
    const invalid: RegItem[] = [];
    for (const item of items) {
        if (item.keyPath.trim()) {
            runnable.push(item);
        } else {
            invalid.push(item);
        }
    }
    return { runnable, invalid };
}

function startJob(kind: "read" | "write", label: string, rows: RegProgressRow[]): string {
    const uid = newJobUid();
    registryReportStore.jobs.push({
        uid,
        kind,
        startedAt: Date.now(),
        label,
        running: true,
        setupError: "",
        rows,
    });
    return uid;
}

function failJob(uid: string, message: string): void {
    const live = findJob(uid);
    if (!live) {
        return;
    }
    live.running = false;
    live.setupError = message;
    live.rows = live.rows.map((row) => (row.status === "pending" ? { ...row, status: "failed" as const, error: message } : row));
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

    const ok = await store.set(doAsyncExecuteConfirmDialogAtom, confirmRegistryElevationRestartMessages);
    if (ok) {
        const proceed = await resolveDirtyTabsBeforeDestructiveAction();
        if (proceed === "cancel") {
            return false;
        }
        try {
            await settingsBus.requestElevationRestart();
        } catch (e) {
            registryEditorStore.error = `Failed to relaunch elevated: ${String(e)}`;
        }
    }
    return false;
}

/** Resolve a uid against the live tree so runners always act on current data. */
function liveItem(uid: string | undefined): RegItem | null {
    if (!uid) {
        return null;
    }
    const loc = findByUid(registryEditorStore.config, uid);
    return loc?.kind === "item" ? loc.item : null;
}

function liveGroup(uid: string | undefined): RegGroup | null {
    if (!uid) {
        return null;
    }
    const loc = findByUid(registryEditorStore.config, uid);
    return loc?.kind === "group" ? loc.group : null;
}

// ---------------------------------------------------------------------------
// Read

async function runRead(items: RegItem[], label: string): Promise<void> {
    const { runnable, invalid } = partitionRunnable(items);
    if (!runnable.length && !invalid.length) {
        notice.warning("Nothing to read");
        return;
    }

    const rows = [...runnable, ...invalid].map(newRow);
    for (let i = runnable.length; i < rows.length; i++) {
        rows[i].status = "failed";
        rows[i].error = "Key path is empty";
    }

    const jobUid = startJob("read", label, rows);

    for (const item of runnable) {
        if (item.uid) {
            registryReadStore.byUid[item.uid] = { at: Date.now(), loading: true, exists: false };
        }
    }

    try {
        const { results } = await registryOpsBus.readBatch(runnable.map(toSpec));
        applyReadResults(jobUid, runnable, results);
    } catch (e) {
        for (const item of runnable) {
            if (item.uid) {
                registryReadStore.byUid[item.uid] = { at: Date.now(), loading: false, exists: false, error: String(e) };
            }
        }
        failJob(jobUid, String(e));
        return;
    }

    const live = findJob(jobUid);
    if (live) {
        live.running = false;
    }
}

function applyReadResults(jobUid: string, items: RegItem[], results: RegReadResult[]): void {
    const live = findJob(jobUid);

    for (const result of results) {
        const item = items[result.index];
        if (!item) {
            continue;
        }

        if (item.uid) {
            registryReadStore.byUid[item.uid] = {
                at: Date.now(),
                loading: false,
                exists: result.exists,
                valueType: result.valueType,
                value: result.value,
                error: result.error,
            };
        }

        const row = live?.rows[result.index];
        if (!row) {
            continue;
        }
        if (result.error) {
            row.status = "failed";
            row.error = result.error;
        } else if (!result.exists) {
            row.status = "missing";
        } else {
            row.status = "read";
            row.value = result.value;
            if (result.valueType) {
                row.valueType = result.valueType;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Write

async function runWrite(items: RegItem[], label: string, groupRequiresElevation: boolean): Promise<void> {
    const { runnable, invalid } = partitionRunnable(items);
    if (!runnable.length) {
        notice.warning(invalid.length ? "Nothing to write — key paths are empty" : "Nothing to write");
        return;
    }

    const store = getDefaultStore();

    if (store.get(confirmRegistryWritesAtom)) {
        const ok = await store.set(doAsyncExecuteConfirmDialogAtom, getConfirmRegistryWriteMessages(runnable.length, label));
        if (!ok) {
            return;
        }
    }

    // Elevation is needed when any item says so, or targets a machine-wide hive.
    const needsElevation =
        groupRequiresElevation
        || runnable.some((item) => item.requireElevated || hiveNeedsElevation(item.hive));

    if (!(await ensureElevatedOrPrompt(needsElevation))) {
        return;
    }

    const rows = [...runnable, ...invalid].map(newRow);
    for (let i = runnable.length; i < rows.length; i++) {
        rows[i].status = "failed";
        rows[i].error = "Key path is empty";
    }

    const jobUid = startJob("write", label, rows);

    let accessDenied = false;
    try {
        const { results } = await registryOpsBus.writeBatch(runnable.map(toSpec));
        const live = findJob(jobUid);

        for (const result of results) {
            const item = runnable[result.index];
            const row = live?.rows[result.index];
            if (!row) {
                continue;
            }
            row.status = result.status;
            row.previousValue = result.previousValue;
            row.error = result.error;
            if (result.status !== "failed") {
                row.value = item?.newValue;
                // The machine now matches what we wrote; keep the read-back in step.
                if (item?.uid) {
                    registryReadStore.byUid[item.uid] = {
                        at: Date.now(),
                        loading: false,
                        exists: true,
                        valueType: item.valueType,
                        value: item.newValue,
                    };
                }
            }
            accessDenied = accessDenied || !!result.accessDenied;
        }

        if (live) {
            live.running = false;
        }
    } catch (e) {
        failJob(jobUid, String(e));
        return;
    }

    if (accessDenied) {
        // Elevation was not predicted by the hive rules; offer the restart now.
        await ensureElevatedOrPrompt(true);
    }
}

// ---------------------------------------------------------------------------
// Action atoms
//
// Discrete UI actions live in Jotai; the runners above own the Valtio stores.

export const doAsyncRegReadItemAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const item = liveItem(uid);
        if (item) {
            await runRead([item], itemLabel(item));
        }
    },
);

export const doAsyncRegReadGroupAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const group = liveGroup(uid);
        if (group) {
            await runRead(collectGroupItems(group), group.name || "Group");
        }
    },
);

export const doAsyncRegReadAllAtom = atom(
    null,
    async (_get, _set): Promise<void> => {
        const items = registryEditorStore.config.groups.flatMap((group) => collectGroupItems(group));
        await runRead(items, "All groups");
    },
);

export const doAsyncRegWriteItemAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const item = liveItem(uid);
        if (item) {
            await runWrite([item], itemLabel(item), !!item.requireElevated);
        }
    },
);

export const doAsyncRegWriteGroupAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const group = liveGroup(uid);
        if (group) {
            await runWrite(collectGroupItems(group), group.name || "Group", !!group.requireElevated);
        }
    },
);

/** Open regedit at the selected item's key. */
export const doAsyncRegJumpItemAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const item = liveItem(uid);
        if (!item?.keyPath.trim()) {
            notice.warning("Set a key path first");
            return;
        }
        try {
            await registryOpsBus.jump(item.hive, item.keyPath);
        } catch (e) {
            notice.error(`Failed to open regedit:<br/>${String(e)}`);
        }
    },
);
