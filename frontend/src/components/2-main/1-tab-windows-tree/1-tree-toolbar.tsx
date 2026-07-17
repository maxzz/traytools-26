import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { RefreshCw } from "lucide-react";
import { cn } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { windowTreeStore, refreshWindowTree } from "@/components/2-main/1-tab-windows-tree/a-windows-tree-calls";
import { treeFilterAtom, showHandlesAtom, hideInvisibleAtom } from "./s-windows-tree-state";

export function WindowTreeToolbar() {
    const snap = useSnapshot(windowTreeStore);
    const [filter, setFilter] = useAtom(treeFilterAtom);
    const [showHandles, setShowHandles] = useAtom(showHandlesAtom);
    const [hideInvisible, setHideInvisible] = useAtom(hideInvisibleAtom);

    return (
        <>
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
                    className="flex-1 h-7 min-w-40 text-xs"
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
        </>
    );
}
