import { type HTMLAttributes } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { TreeProvider, TreeView } from "@/ui/shadcn/kibo-ui-tree";
import { isProcessGroupHandle, processGroupId } from "@/bridge";
import { windowTreeStore, loadSelectionInfo, maybeHighlightSelectedWindow } from "./a-windows-tree-calls";
import { recordProcessSelection } from "./a-process-history";
import { selectedHandleAtom, treeFilterAtom, hideInvisibleAtom, groupByProcessAtom, filteredTreeAtom, treeExpandRevisionAtom } from "./s-windows-tree-state";
import { WindowTreeNode } from "./2-1-tree-node";

const treeScrollViewportProps = {
    "data-windows-tree-scroll": "",
} as HTMLAttributes<HTMLDivElement>;

export function WindowTreeView() {
    const { count, loading, error } = useSnapshot(windowTreeStore);
    const { windowHighlight } = useSnapshot(appSettings);
    const [selected, setSelected] = useAtom(selectedHandleAtom);
    const filterText = useAtomValue(treeFilterAtom);
    const hideInvisible = useAtomValue(hideInvisibleAtom);
    const groupByProcess = useAtomValue(groupByProcessAtom);
    const expandRevision = useAtomValue(treeExpandRevisionAtom);
    const { tree, expandIds } = useAtomValue(filteredTreeAtom);

    const needle = filterText.trim().toLowerCase();
    const autoHighlight = windowHighlight.autoHighlight;

    const onSelectionChange = (ids: string[]) => {
        const handle = ids.length > 0 ? ids[0] : null;
        setSelected(handle);
        if (handle && isProcessGroupHandle(handle)) {
            // Process folders have no on-screen rectangle to highlight.
            void loadSelectionInfo(handle);
            const pid = processGroupId(handle);
            if (pid != null) {
                recordProcessSelection(pid);
            }
            return;
        }
        if (autoHighlight) {
            void maybeHighlightSelectedWindow(handle);
        } else {
            void loadSelectionInfo(handle);
        }
    };

    const onReselect = (nodeId: string) => {
        if (!autoHighlight || isProcessGroupHandle(nodeId)) {
            return;
        }
        void maybeHighlightSelectedWindow(nodeId);
    };

    // Re-key the provider so default expansion re-applies when the data, the
    // filter, or an explicit collapse/expand revision changes (kibo tree
    // expansion is otherwise uncontrolled).
    const providerKey = `${count}|${needle}|${hideInvisible}|${groupByProcess}|${expandRevision}`;

    return (
        <div className="relative size-full min-h-0">
            <div className="absolute inset-0 px-0.5">
                <ScrollArea
                    className="size-full"
                    fixedWidth
                    parentContentWidth
                    viewportProps={treeScrollViewportProps}
                >
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
                                    onReselect={onReselect}
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
