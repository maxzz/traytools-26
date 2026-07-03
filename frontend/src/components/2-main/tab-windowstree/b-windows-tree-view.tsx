import { useMemo } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { RefreshCw } from "lucide-react";
import { type WindowNode } from "@/bridge";
import { cn } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { TreeProvider, TreeView } from "@/ui/shadcn/kibo-ui-tree";
import { windowTreeStore, refreshWindowTree, loadWindowInfo } from "@/store/4-windows-tree";
import { selectedHandleAtom, treeFilterAtom, showHandlesAtom, hideInvisibleAtom } from "./a-windows-tree-atoms";
import { WindowTreeNode } from "./c-tree-node";

const WS_VISIBLE = 0x10000000;

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
    const selfMatches = needle === ""
        ? true
        : `${node.className} ${node.title} ${node.handle}`.toLowerCase().includes(needle);

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
    const [filter, setFilter] = useAtom(treeFilterAtom);
    const [showHandles, setShowHandles] = useAtom(showHandlesAtom);
    const [hideInvisible, setHideInvisible] = useAtom(hideInvisibleAtom);

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
        <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
            <div className="px-2 py-1.5 border-b flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold">Windows Tree</span>
                <span className="tabular-nums text-[11px] text-muted-foreground">{snap.count} windows</span>

                <Button
                    size="xs"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => void refreshWindowTree()}
                    disabled={snap.loading}
                >
                    <RefreshCw className={cn("mr-1 size-3", snap.loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            <div className="px-2 py-1.5 border-b flex items-center gap-3 flex-wrap">
                <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter by class or title..."
                    className="flex-1 h-7 min-w-0 text-xs"
                />
                <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={showHandles} onCheckedChange={(v) => setShowHandles(v === true)} />
                    Handles
                </label>
                <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={hideInvisible} onCheckedChange={(v) => setHideInvisible(v === true)} />
                    Hide invisible
                </label>
            </div>

            <ScrollArea className="flex-1 min-h-0" fixedWidth parentContentWidth>
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
                                className="w-full min-w-0"
                            >
                                <TreeView className="p-1 min-w-0">
                                    <WindowTreeNode node={tree} level={0} isLast parentPath={[]} showHandles={showHandles} />
                                </TreeView>
                            </TreeProvider>
                        )}
            </ScrollArea>
        </div>
    );
}
