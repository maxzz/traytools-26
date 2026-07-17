import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { RefreshCw, Settings } from "lucide-react";
import { cn } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { windowTreeStore, refreshWindowTree } from "@/components/2-main/1-tab-windows-tree/a-windows-tree-calls";
import { treeFilterAtom, showHandlesAtom, hideInvisibleAtom } from "./s-windows-tree-state";

export function WindowTreeToolbar() {
    const { count, loading } = useSnapshot(windowTreeStore);
    const [filter, setFilter] = useAtom(treeFilterAtom);

    return (
        <div className="bg-app-background/10">
            <div className={"mx-1 my-0.5 bg-background border rounded"}>

                <div className="px-2 py-1.5 border-b flex items-center gap-2 flex-wrap">
                    <Input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Filter by class or title..."
                        className="flex-1 h-7 min-w-40 text-xs"
                    />

                    <span className="text-xs font-semibold">Windows Tree</span>
                    <span className="tabular-nums text-[11px] text-muted-foreground">{count} windows</span>

                    <Button className="ml-auto" size="xs" variant="outline" onClick={() => void refreshWindowTree()} disabled={loading}>
                        <RefreshCw className={cn("mr-1 size-3", loading && "animate-spin")} />
                        Refresh
                    </Button>

                    <TreeOptionsPopover />
                </div>
            </div>
        </div>
    );
}

function TreeOptionsPopover() {
    const [showHandles, setShowHandles] = useAtom(showHandlesAtom);
    const [hideInvisible, setHideInvisible] = useAtom(hideInvisibleAtom);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size="icon-xs" variant="outline" title="Tree options" type="button">
                    <Settings className="size-3" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto">
                <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={showHandles} onCheckedChange={(v) => setShowHandles(v === true)} />
                    Handles
                </label>
                <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={hideInvisible} onCheckedChange={(v) => setHideInvisible(v === true)} />
                    Hide invisible
                </label>
            </PopoverContent>
        </Popover>
    );
}
