import { atom, getDefaultStore } from "jotai";
import { COMBO_MRU } from "@/components/2-main/2-tab-sync/5-skip-patterns/combo-mru/3-combo-mru";
import { rememberComboMruMany } from "./combo-mru/a-combo-mru-store";
import { findByUid } from "../a-atoms/9-types-sync";
import { syncEditorStore } from "../a-atoms/0-sync-local-storage";
import {
    defaultSkipPatterns,
    resolvedSkipPatterns,
    sanitizeSkipPatterns,
    skipPatternError,
} from "./b-1-skip-patterns";

export type SkipDraftRow = {
    id: string;
    pattern: string;
};

export type SkipListDialogState = {
    itemUid: string;
    rows: SkipDraftRow[];
};

export const skipListDialogAtom = atom<SkipListDialogState | null>(null);

let rowSeq = 0;

function newRowId(): string {
    rowSeq += 1;
    return `skip-row-${rowSeq}`;
}

function rowsFromPatterns(patterns: readonly string[]): SkipDraftRow[] {
    if (patterns.length === 0) {
        return [];
    }
    return patterns.map((pattern) => ({ id: newRowId(), pattern }));
}

export function openSkipListDialog(itemUid: string, patterns: readonly string[] | undefined): void {
    getDefaultStore().set(skipListDialogAtom, {
        itemUid,
        rows: rowsFromPatterns(resolvedSkipPatterns(patterns)),
    });
}

export function closeSkipListDialog(): void {
    getDefaultStore().set(skipListDialogAtom, null);
}

export function setSkipListRowPattern(id: string, pattern: string): void {
    const store = getDefaultStore();
    const dlg = store.get(skipListDialogAtom);
    if (!dlg) {
        return;
    }
    store.set(skipListDialogAtom, {
        ...dlg,
        rows: dlg.rows.map((row) => (row.id === id ? { ...row, pattern } : row)),
    });
}

export function addSkipListRow(): string | undefined {
    const store = getDefaultStore();
    const dlg = store.get(skipListDialogAtom);
    if (!dlg) {
        return;
    }
    const id = newRowId();
    store.set(skipListDialogAtom, {
        ...dlg,
        rows: [...dlg.rows, { id, pattern: "" }],
    });
    return id;
}

export function removeSkipListRow(id: string): void {
    const store = getDefaultStore();
    const dlg = store.get(skipListDialogAtom);
    if (!dlg) {
        return;
    }
    store.set(skipListDialogAtom, {
        ...dlg,
        rows: dlg.rows.filter((row) => row.id !== id),
    });
}

export function resetSkipListRowsToDefault(): void {
    const store = getDefaultStore();
    const dlg = store.get(skipListDialogAtom);
    if (!dlg) {
        return;
    }
    store.set(skipListDialogAtom, {
        ...dlg,
        rows: rowsFromPatterns(defaultSkipPatterns()),
    });
}

export const skipListHasInvalidAtom = atom((get) => {
    const dlg = get(skipListDialogAtom);
    if (!dlg) {
        return false;
    }
    return dlg.rows.some((row) => skipPatternError(row.pattern) != null);
});

/** Write the draft onto the sync item and close. Returns false when validation fails. */
export function applySkipListDialog(): boolean {
    const store = getDefaultStore();
    const dlg = store.get(skipListDialogAtom);
    if (!dlg) {
        return false;
    }
    if (dlg.rows.some((row) => skipPatternError(row.pattern) != null)) {
        return false;
    }

    const loc = findByUid(syncEditorStore.config, dlg.itemUid);
    if (loc?.kind === "item") {
        const cleaned = sanitizeSkipPatterns(dlg.rows.map((row) => row.pattern));
        // [] is stored as-is (copy everything). The default pair is stored in
        // memory for the UI but omitted from sync.json on save.
        loc.item.skipPatterns = cleaned;
        rememberComboMruMany(COMBO_MRU.skipPatterns, cleaned);
    }

    store.set(skipListDialogAtom, null);
    return true;
}
