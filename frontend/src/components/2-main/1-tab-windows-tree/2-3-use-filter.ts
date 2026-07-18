import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { type WindowNode } from "@/bridge";
import { windowTreeStore } from "@/components/2-main/1-tab-windows-tree/a-windows-tree-calls";
import {
    treeFilterAtom,
    hideInvisibleAtom,
    filteredTreeAtom,
    displayedCountAtom,
} from "./s-windows-tree-state";
import { countDisplayedWindows, filterNode } from "./2-2-tree-filter";

// Single filter pass for the tab: drives the tree view and the displayed count.
export function useFilter() {
    const { root } = useSnapshot(windowTreeStore);
    const filter = useAtomValue(treeFilterAtom);
    const hideInvisible = useAtomValue(hideInvisibleAtom);
    const setFilteredTree = useSetAtom(filteredTreeAtom);
    const setDisplayedCount = useSetAtom(displayedCountAtom);

    useEffect(
        () => {
            if (!root) {
                setFilteredTree({ tree: null, expandIds: [] });
                setDisplayedCount(0);
                return;
            }
            const needle = filter.trim().toLowerCase();
            const ids: string[] = [];
            const filtered = filterNode(root as WindowNode, needle, hideInvisible, ids);
            const isFiltering = needle !== "" || hideInvisible;
            setFilteredTree({ tree: filtered, expandIds: isFiltering ? ids : ["root"] });
            setDisplayedCount(countDisplayedWindows(filtered));
        },
        [root, filter, hideInvisible, setFilteredTree, setDisplayedCount]);
}
