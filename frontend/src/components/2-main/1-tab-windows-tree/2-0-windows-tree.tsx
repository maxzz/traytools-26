import { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { TreeProvider, TreeView } from "@/ui/shadcn/kibo-ui-tree";
import { windowTreeStore, loadWindowInfo } from "@/components/2-main/1-tab-windows-tree/a-windows-tree-calls";
import { selectedHandleAtom, treeFilterAtom, hideInvisibleAtom } from "./s-windows-tree-state";
import { type WindowNode } from "@/bridge";
import { WindowTreeNode } from "./2-1-tree-node";
import { filterNode } from "./2-2-tree-filter";

export function WindowTreeView() {
    const { root, count, loading, error } = useSnapshot(windowTreeStore);
    const [selected, setSelected] = useAtom(selectedHandleAtom);
    const filterText = useAtomValue(treeFilterAtom);
    const hideInvisible = useAtomValue(hideInvisibleAtom);

    const needle = filterText.trim().toLowerCase();

    const { tree, expandIds } = useMemo(
        () => {
            if (!root) {
                return { tree: null as WindowNode | null, expandIds: [] as string[] };
            }
            const ids: string[] = [];
            const filtered = filterNode(root as WindowNode, needle, hideInvisible, ids);
            const isFiltering = needle !== "" || hideInvisible;
            return { tree: filtered, expandIds: isFiltering ? ids : ["root"] };
        },
        [root, needle, hideInvisible]);

    const onSelectionChange = (ids: string[]) => {
        const handle = ids.length > 0 ? ids[0] : null;
        setSelected(handle);
        loadWindowInfo(handle);
    };

    // Re-key the provider so default expansion re-applies when the data or the
    // filter changes (kibo tree expansion is otherwise uncontrolled).
    const providerKey = `${count}|${needle}|${hideInvisible}`;

    return (
        <div className="relative size-full min-h-0">
            <div className="absolute inset-0 px-0.5">
                <ScrollArea className="size-full" fixedWidth parentContentWidth>
                    {error
                        ? (
                            <div className="p-3 text-xs text-destructive">
                                Failed to load window tree: {error}
                            </div>
                        )
                        : !tree
                            ? (
                                <div className="p-3 text-xs text-muted-foreground">
                                    {loading ? "Loading..." : "No windows. Press Refresh."}
                                </div>
                            )
                            : (
                                <TreeProvider
                                    className="w-full"
                                    indent={16}
                                    showLines
                                    animateExpand={false}
                                    defaultExpandedIds={expandIds}
                                    selectedIds={selected ? [selected] : []}
                                    onSelectionChange={onSelectionChange}
                                    key={providerKey}
                                >
                                    <TreeView className="p-0">
                                        <WindowTreeNode node={tree} level={0} isLast parentPath={[]} />
                                    </TreeView>
                                </TreeProvider>
                            )}
                </ScrollArea>
            </div>
        </div>
    );
}
