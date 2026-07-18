import { useAtom, useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { RefreshCw, Settings } from "lucide-react";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { windowTreeStore, refreshWindowTree } from "@/components/2-main/1-tab-windows-tree/a-windows-tree-calls";
import {
    treeFilterAtom,
    showHandlesAtom,
    hideInvisibleAtom,
    displayedCountAtom,
} from "./s-windows-tree-state";
import { useFilter } from "./2-3-use-filter";

export function WindowTreeToolbar() {
    const { loading } = useSnapshot(windowTreeStore);
    const [filter, setFilter] = useAtom(treeFilterAtom);

    useFilter();

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

                    <Button className="ml-auto" size="xs" variant="outline" onClick={() => void refreshWindowTree()} disabled={loading}>
                        <RefreshCw className={classNames("mr-1 size-3", loading && "animate-spin")} />
                        Refresh
                    </Button>

                    <TreeOptionsPopover />
                </div>
            </div>
        </div>
    );
}

function TreeOptionsPopover() {
    const { count } = useSnapshot(windowTreeStore);
    const [showHandles, setShowHandles] = useAtom(showHandlesAtom);
    const [hideInvisible, setHideInvisible] = useAtom(hideInvisibleAtom);
    const displayed = useAtomValue(displayedCountAtom);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size="icon-xs" variant="outline" title="Tree options" type="button">
                    <Settings className="size-3" />
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-auto">

            <span className="text-xs font-semibold">Tree options</span>

                <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={showHandles} onCheckedChange={(v) => setShowHandles(v === true)} />
                    Handles
                </label>

                <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={hideInvisible} onCheckedChange={(v) => setHideInvisible(v === true)} />
                    Hide invisible
                </label>

                <div className="-mx-2 h-px border-t border-border"></div>

                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                        <span className="text-xs">Total windows:</span>
                        <span className="tabular-nums text-[11px] text-muted-foreground">{count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs">Displayed:</span>
                        <span className="tabular-nums text-[11px] text-muted-foreground">{displayed}</span>
                    </div>
                </div>

            </PopoverContent>
        </Popover>
    );
}
