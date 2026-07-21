import { useLayoutEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { snapshot } from "valtio";
import { subscribeKey } from "valtio/utils";
import { type WindowNode } from "@/bridge";
import { treeFilterAtom, hideInvisibleAtom, filteredTreeAtom, displayedCountAtom } from "./s-windows-tree-state";
import { windowTreeStore } from "./a-windows-tree-calls";

// Single filter pass for the tab: drives the tree view and the displayed count.
// Syncs via useLayoutEffect + subscribeKey so a successful getTree cannot leave
// filteredTreeAtom null for a painted frame (or permanently, if an effect was skipped).
export function useFilter() {
    const filter = useAtomValue(treeFilterAtom);
    const hideInvisible = useAtomValue(hideInvisibleAtom);
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
                const filtered = filterNode(root, needle, hideInvisible, ids);
                const isFiltering = needle !== "" || hideInvisible;
                setFilteredTree({ tree: filtered, expandIds: isFiltering ? ids : ["root"] });
                setDisplayedCount(countDisplayedWindows(filtered));
            };

            sync();
            return subscribeKey(windowTreeStore, "root", sync);
        },
        [filter, hideInvisible, setFilteredTree, setDisplayedCount]);
}

/** Count non-root window nodes currently shown in the (possibly filtered) tree. */
function countDisplayedWindows(node: WindowNode | null): number {
    if (!node) {
        return 0;
    }
    let n = node.handle === "root" ? 0 : 1;
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
    const selfMatches = needle === "" ? true : `${node.className} ${node.title} ${node.handle}`.toLowerCase().includes(needle);

    const keep = isRoot || ((selfMatches && !selfInvisible) || kids.length > 0);
    if (!keep) {
        return null;
    }

    if (kids.length > 0) {
        collectIds.push(node.handle);
    }
    return { ...node, children: kids };
}

const WS_VISIBLE = 0x10000000;
