import { getDefaultStore } from "jotai";
import { processGroupHandle, type WindowNode } from "@/bridge";
import {
    PROCESS_HISTORY_MAX,
    filteredTreeAtom,
    processHistoryAtom,
    type ProcessHistoryEntry,
} from "./s-windows-tree-state";
import { jumpToProcessInTree } from "./a-windows-tree-calls";

/** Record a user-driven process selection (tree click, parent jump, etc.). */
export function recordProcessSelection(processId: number): void {
    if (!processId) {
        return;
    }
    const processName = processLabelFromTree(processId);
    const store = getDefaultStore();
    store.set(processHistoryAtom, (prev) => {
        const cur = prev.index >= 0 ? prev.entries[prev.index] : null;
        if (cur?.processId === processId) {
            if (cur.processName === processName) {
                return prev;
            }
            const entries = prev.entries.slice();
            entries[prev.index] = { processId, processName };
            return { entries, index: prev.index };
        }

        let entries = prev.entries.slice(0, Math.max(0, prev.index + 1));
        entries.push({ processId, processName });
        if (entries.length > PROCESS_HISTORY_MAX) {
            entries = entries.slice(entries.length - PROCESS_HISTORY_MAX);
        }
        return { entries, index: entries.length - 1 };
    });
}

/** Jump to a process and append it to the session history (parent-PID link, etc.). */
export function selectProcessInTree(processId: number): void {
    jumpToProcessInTree(processId);
    recordProcessSelection(processId);
}

export function clearProcessHistory(): void {
    getDefaultStore().set(processHistoryAtom, { entries: [], index: -1 });
}

export function goProcessHistoryBack(): void {
    const store = getDefaultStore();
    const prev = store.get(processHistoryAtom);
    if (prev.index <= 0) {
        return;
    }
    navigateProcessHistoryTo(prev.index - 1);
}

export function goProcessHistoryForward(): void {
    const store = getDefaultStore();
    const prev = store.get(processHistoryAtom);
    if (prev.index < 0 || prev.index >= prev.entries.length - 1) {
        return;
    }
    navigateProcessHistoryTo(prev.index + 1);
}

/** Jump to a specific history index (context-menu pick). */
export function navigateProcessHistoryTo(index: number): void {
    const store = getDefaultStore();
    const prev = store.get(processHistoryAtom);
    if (index < 0 || index >= prev.entries.length) {
        return;
    }
    const entry = prev.entries[index];
    store.set(processHistoryAtom, { entries: prev.entries, index });
    jumpToProcessInTree(entry.processId);
}

/** Entries reachable by going back (nearest first). */
export function processHistoryBackEntries(state: { entries: ProcessHistoryEntry[]; index: number }): { entry: ProcessHistoryEntry; index: number; }[] {
    const out: { entry: ProcessHistoryEntry; index: number; }[] = [];
    for (let i = state.index - 1; i >= 0; i--) {
        out.push({ entry: state.entries[i], index: i });
    }
    return out;
}

/** Entries reachable by going forward (nearest first). */
export function processHistoryForwardEntries(state: { entries: ProcessHistoryEntry[]; index: number }): { entry: ProcessHistoryEntry; index: number; }[] {
    const out: { entry: ProcessHistoryEntry; index: number; }[] = [];
    for (let i = state.index + 1; i < state.entries.length; i++) {
        out.push({ entry: state.entries[i], index: i });
    }
    return out;
}

function processLabelFromTree(processId: number): string {
    const tree = getDefaultStore().get(filteredTreeAtom).tree;
    const node = findNodeByHandle(tree, processGroupHandle(processId));
    const name = (node?.processName ?? "").trim();
    return name !== "" ? name : `PID ${processId}`;
}

function findNodeByHandle(node: WindowNode | null, handle: string): WindowNode | null {
    if (!node) {
        return null;
    }
    if (node.handle === handle) {
        return node;
    }
    for (const child of node.children ?? []) {
        const found = findNodeByHandle(child, handle);
        if (found) {
            return found;
        }
    }
    return null;
}
