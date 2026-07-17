import { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { type WindowNode } from "@/bridge";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { TreeProvider, TreeView } from "@/ui/shadcn/kibo-ui-tree";
import { windowTreeStore, loadWindowInfo } from "@/components/2-main/1-tab-windows-tree/a-windows-tree-calls";
import { selectedHandleAtom, treeFilterAtom, hideInvisibleAtom } from "./s-windows-tree-state";
import { WindowTreeNode } from "./2-1-tree-node";

// Recursively filter the tree, keeping a node when it (or any descendant)
// matches the text filter and passes the visibility filter. Returns plain
// objects so the result is safe to render outside the Valtio snapshot.
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

export function WindowTreeView() {
    const snap = useSnapshot(windowTreeStore);
    const [selected, setSelected] = useAtom(selectedHandleAtom);
    const filter = useAtomValue(treeFilterAtom);
    const hideInvisible = useAtomValue(hideInvisibleAtom);

    const needle = filter.trim().toLowerCase();

    const { tree, expandIds } = useMemo(
        () => {
            if (!snap.root) {
                return { tree: null as WindowNode | null, expandIds: [] as string[] };
            }
            const ids: string[] = [];
            const filtered = filterNode(snap.root as WindowNode, needle, hideInvisible, ids);
            const isFiltering = needle !== "" || hideInvisible;
            return { tree: filtered, expandIds: isFiltering ? ids : ["root"] };
        },
        [snap.root, needle, hideInvisible],
    );

    const onSelectionChange = (ids: string[]) => {
        const handle = ids.length > 0 ? ids[0] : null;
        setSelected(handle);
        void loadWindowInfo(handle);
    };

    // Re-key the provider so default expansion re-applies when the data or the
    // filter changes (kibo tree expansion is otherwise uncontrolled).
    const providerKey = `${snap.count}|${needle}|${hideInvisible}`;

    return (
        <div className="relative size-full min-h-0">
            <div className="absolute inset-0">
                <ScrollArea className="size-full" fixedWidth parentContentWidth>
                    {snap.error
                        ? <div className="p-3 text-xs text-destructive">Failed to load window tree: {snap.error}</div>
                        : !tree
                            ? <div className="p-3 text-xs text-muted-foreground">{snap.loading ? "Loading..." : "No windows. Press Refresh."}</div>
                            : (
                                <TreeProvider
                                    key={providerKey}
                                    defaultExpandedIds={expandIds}
                                    selectedIds={selected ? [selected] : []}
                                    onSelectionChange={onSelectionChange}
                                    showLines
                                    indent={16}
                                    animateExpand={false}
                                    className="w-full"
                                >
                                    <TreeView className="p-1">
                                        <WindowTreeNode node={tree} level={0} isLast parentPath={[]} />
                                    </TreeView>
                                </TreeProvider>
                            )}
                </ScrollArea>
            </div>
        </div>
    );
}

const WS_VISIBLE = 0x10000000;
