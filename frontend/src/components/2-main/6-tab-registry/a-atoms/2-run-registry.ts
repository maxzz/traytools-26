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
import { isNumericRegType, tryParseRegNumber } from "./7-reg-file-format";
import {
    type RegGroup,
    type RegItem,
    type RegValue,
    type RegValueRef,
    collectGroupValueRefs,
    findByUid,
    findValueByUid,
    fullKeyPath,
    hiveNeedsElevation,
    itemHasSubKey,
    itemHive,
    itemLabel,
    itemSubKeyPath,
    itemValueRefs,
    valueDisplayName,
    valueRefLabel,
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

/** True when the value on the machine already equals what the editor would write. */
export function readMatchesDesired(read: RegReadState | undefined, value: Pick<RegValue, "valueType" | "newValue">): boolean {
    if (!read || read.loading || !read.exists || read.valueType !== value.valueType) {
        return false;
    }
    // DWORD/QWORD may be shown as decimal in one column and 0x hex in the other.
    if (isNumericRegType(value.valueType)) {
        const a = tryParseRegNumber(read.value ?? "");
        const b = tryParseRegNumber(value.newValue);
        return a !== null && b !== null && a === b;
    }
    return read.value === value.newValue;
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

/** Display radix for DWORD/QWORD in the Values table "New value" column. */
export type RegNumericRadix = 10 | 16;

/** Whether hex is shown with a 0x prefix, or bare (`"--"` in the UI). */
export type RegHexPrefixMode = "0x" | "none";

/** Whether hex is zero-padded to the type width (`"00"` in the UI), or not (`"--"`). */
export type RegHexPadMode = "none" | "pad";

export const newValueRadixAtom = atomWithStorage<RegNumericRadix>("reg.newValueRadix", 10);
export const currentValueRadixAtom = atomWithStorage<RegNumericRadix>("reg.currentValueRadix", 10);
export const newValueHexPrefixAtom = atomWithStorage<RegHexPrefixMode>("reg.newValueHexPrefix", "0x");
export const currentValueHexPrefixAtom = atomWithStorage<RegHexPrefixMode>("reg.currentValueHexPrefix", "0x");
export const newValueHexPadAtom = atomWithStorage<RegHexPadMode>("reg.newValueHexPad", "none");
export const currentValueHexPadAtom = atomWithStorage<RegHexPadMode>("reg.currentValueHexPad", "none");

// ---------------------------------------------------------------------------
// Helpers

function toSpec({ item, value }: RegValueRef): RegValueSpec {
    return {
        hive: itemHive(item),
        keyPath: itemSubKeyPath(item),
        valueName: value.valueName,
        valueType: value.valueType,
        value: value.newValue,
        view: item.view,
    };
}

function newRow(ref: RegValueRef): RegProgressRow {
    return {
        uid: ref.value.uid,
        label: valueRefLabel(ref),
        keyPath: fullKeyPath(ref.item),
        valueName: valueDisplayName(ref.value.valueName),
        valueType: ref.value.valueType,
        status: "pending",
    };
}

/**
 * Split targets into those that can be sent to the backend and those that are
 * incomplete. An empty key path would resolve to the hive root, so it is
 * rejected here rather than silently writing somewhere unexpected.
 */
function partitionRunnable(refs: RegValueRef[]): { runnable: RegValueRef[]; invalid: RegValueRef[]; } {
    const runnable: RegValueRef[] = [];
    const invalid: RegValueRef[] = [];
    for (const ref of refs) {
        if (itemHasSubKey(ref.item)) {
            runnable.push(ref);
        } else {
            invalid.push(ref);
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

/** Resolve a single value uid to the pair the runners operate on. */
function liveValueRef(uid: string | undefined): RegValueRef | null {
    if (!uid) {
        return null;
    }
    const loc = findValueByUid(registryEditorStore.config, uid);
    return loc ? { item: loc.item, value: loc.value } : null;
}

// ---------------------------------------------------------------------------
// Read

async function runRead(refs: RegValueRef[], label: string): Promise<void> {
    const { runnable, invalid } = partitionRunnable(refs);
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

    for (const { value } of runnable) {
        if (value.uid) {
            registryReadStore.byUid[value.uid] = { at: Date.now(), loading: true, exists: false };
        }
    }

    try {
        const { results } = await registryOpsBus.readBatch(runnable.map(toSpec));
        applyReadResults(jobUid, runnable, results);
    } catch (e) {
        for (const { value } of runnable) {
            if (value.uid) {
                registryReadStore.byUid[value.uid] = { at: Date.now(), loading: false, exists: false, error: String(e) };
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

function applyReadResults(jobUid: string, refs: RegValueRef[], results: RegReadResult[]): void {
    const live = findJob(jobUid);

    for (const result of results) {
        const ref = refs[result.index];
        if (!ref) {
            continue;
        }

        if (ref.value.uid) {
            registryReadStore.byUid[ref.value.uid] = {
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

async function runWrite(refs: RegValueRef[], label: string): Promise<void> {
    const { runnable, invalid } = partitionRunnable(refs);
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

    // Machine-wide hives need an elevated process; HKCU does not.
    const needsElevation = runnable.some(({ item }) => hiveNeedsElevation(itemHive(item)));

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
            const value = runnable[result.index]?.value;
            const row = live?.rows[result.index];
            if (!row) {
                continue;
            }
            row.status = result.status;
            row.previousValue = result.previousValue;
            row.error = result.error;
            if (result.status !== "failed") {
                row.value = value?.newValue;
                // The machine now matches what we wrote; keep the read-back in step.
                if (value?.uid) {
                    registryReadStore.byUid[value.uid] = {
                        at: Date.now(),
                        loading: false,
                        exists: true,
                        valueType: value.valueType,
                        value: value.newValue,
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

/** Read every value under one key. */
export const doAsyncRegReadItemAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const item = liveItem(uid);
        if (item) {
            await runRead(itemValueRefs(item), itemLabel(item));
        }
    },
);

/** Read a single value row, addressed by the value's own uid. */
export const doAsyncRegReadValueAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const ref = liveValueRef(uid);
        if (ref) {
            await runRead([ref], valueRefLabel(ref));
        }
    },
);

export const doAsyncRegReadGroupAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const group = liveGroup(uid);
        if (group) {
            await runRead(collectGroupValueRefs(group), group.name || "Group");
        }
    },
);

export const doAsyncRegReadAllAtom = atom(
    null,
    async (_get, _set): Promise<void> => {
        const refs = registryEditorStore.config.groups.flatMap((group) => collectGroupValueRefs(group));
        await runRead(refs, "All groups");
    },
);

/** Write every value under one key. */
export const doAsyncRegWriteItemAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const item = liveItem(uid);
        if (item) {
            await runWrite(itemValueRefs(item), itemLabel(item));
        }
    },
);

/** Write a single value row, addressed by the value's own uid. */
export const doAsyncRegWriteValueAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const ref = liveValueRef(uid);
        if (ref) {
            await runWrite([ref], valueRefLabel(ref));
        }
    },
);

export const doAsyncRegWriteGroupAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const group = liveGroup(uid);
        if (group) {
            await runWrite(collectGroupValueRefs(group), group.name || "Group");
        }
    },
);

/** Open regedit at the selected item's key. */
export const doAsyncRegJumpItemAtom = atom(
    null,
    async (_get, _set, uid: string): Promise<void> => {
        const item = liveItem(uid);
        if (!item || !itemHasSubKey(item)) {
            notice.warning("Set a key path first");
            return;
        }
        try {
            await registryOpsBus.jump(itemHive(item), itemSubKeyPath(item));
        } catch (e) {
            notice.error(`Failed to open regedit:<br/>${String(e)}`);
        }
    },
);
