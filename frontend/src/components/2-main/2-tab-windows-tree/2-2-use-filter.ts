import { useLayoutEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { snapshot } from "valtio";
import { subscribeKey } from "valtio/utils";
import { type WindowNode, isProcessGroupHandle } from "@/bridge";
import { treeFilterAtom, hideInvisibleAtom, groupByProcessAtom, filteredTreeAtom, displayedCountAtom } from "./s-windows-tree-state";
import { windowTreeStore } from "./a-windows-tree-calls";

// Single filter pass for the tab: drives the tree view and the displayed count.
// Syncs via useLayoutEffect + subscribeKey so a successful getTree cannot leave
// filteredTreeAtom null for a painted frame (or permanently, if an effect was skipped).
export function useFilter() {
    const filter = useAtomValue(treeFilterAtom);
    const hideInvisible = useAtomValue(hideInvisibleAtom);
    const groupByProcess = useAtomValue(groupByProcessAtom);
    const setFilteredTree = useSetAtom(filteredTreeAtom);
    const setDisplayedCount = useSetAtom(displayedCountAtom);

    useLayoutEffect(
        () => {
            const sync = () => {
                const root = windowTreeStore.root
                    ? snapshot(windowTreeStore.root) as WindowNode
                    : null;
                if (!root) {
                    setFilteredTree({ tree: null, expandIds: [] });
                    setDisplayedCount(0);
                    return;
                }
                const needle = filter.trim().toLowerCase();
                const ids: string[] = [];
                let filtered = filterNode(root, needle, hideInvisible, ids);
                if (filtered && groupByProcess) {
                    filtered = groupTopLevelByProcessName(filtered);
                    if (needle !== "" || hideInvisible) {
                        // Regrouping inserts new folder ids; expand them when filtering.
                        for (const child of filtered.children ?? []) {
                            if (isProcessGroupHandle(child.handle) && (child.children?.length ?? 0) > 0) {
                                ids.push(child.handle);
                            }
                        }
                    }
                }
                const isFiltering = needle !== "" || hideInvisible;
                setFilteredTree({ tree: filtered, expandIds: isFiltering ? ids : ["root"] });
                setDisplayedCount(countDisplayedWindows(filtered));
            };

            sync();
            return subscribeKey(windowTreeStore, "root", sync);
        },
        [filter, hideInvisible, groupByProcess, setFilteredTree, setDisplayedCount]);
}

/** Count real window nodes currently shown (skip root and process-group folders). */
function countDisplayedWindows(node: WindowNode | null): number {
    if (!node) {
        return 0;
    }
    const skip = node.handle === "root" || isProcessGroupHandle(node.handle);
    let n = skip ? 0 : 1;
    for (const child of node.children ?? []) {
        n += countDisplayedWindows(child);
    }
    return n;
}

/**
 * Recursively filter the tree, keeping a node when it (or any descendant)
 * matches the text filter and passes the visibility filter. Returns plain
 * objects so the result is safe to render outside the Valtio snapshot.
 */
function filterNode(node: WindowNode, needle: string, hideInvisible: boolean, collectIds: string[]): WindowNode | null {
    const kids: WindowNode[] = [];
    for (const child of node.children ?? []) {
        const kept = filterNode(child, needle, hideInvisible, collectIds);
        if (kept) {
            kids.push(kept);
        }
    }

    const isRoot = node.handle === "root";
    const selfInvisible = !isRoot && hideInvisible && (node.style & WS_VISIBLE) === 0;
    const selfMatches = needle === ""
        ? true
        : `${node.className} ${node.title} ${node.handle} ${node.processName ?? ""}`.toLowerCase().includes(needle);

    const keep = isRoot || ((selfMatches && !selfInvisible) || kids.length > 0);
    if (!keep) {
        return null;
    }

    if (kids.length > 0) {
        collectIds.push(node.handle);
    }
    return { ...node, children: kids };
}

/**
 * Regroup the root's direct children under synthetic process-name folders.
 * Process folders appear in first-seen order; windows within each folder keep
 * the original Go enumeration order. Nested child trees are left untouched.
 */
function groupTopLevelByProcessName(root: WindowNode): WindowNode {
    const top = root.children ?? [];
    type Group = { label: string; windows: WindowNode[]; };
    const groups = new Map<string, Group>();
    const order: string[] = [];

    for (const win of top) {
        const name = (win.processName ?? "").trim();
        const key = name !== "" ? name.toLowerCase() : `pid:${win.processId}`;
        const label = name !== "" ? name : `PID ${win.processId}`;
        let group = groups.get(key);
        if (!group) {
            group = { label, windows: [] };
            groups.set(key, group);
            order.push(key);
        }
        group.windows.push(win);
    }

    return {
        ...root,
        children: order.map((key) => {
            const group = groups.get(key)!;
            return {
                handle: `proc:${key}`,
                className: "",
                title: group.label,
                processId: 0,
                threadId: 0,
                processName: group.label,
                style: 0,
                exStyle: 0,
                visible: true,
                children: group.windows,
            };
        }),
    };
}

const WS_VISIBLE = 0x10000000;
