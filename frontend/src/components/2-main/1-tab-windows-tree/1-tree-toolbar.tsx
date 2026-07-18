import { useAtom, useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { RefreshCw, Settings, X } from "lucide-react";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import {
    windowTreeStore,
    refreshWindowTree,
    maybeHighlightSelectedWindow,
    hideWindowHighlight,
} from "@/components/2-main/1-tab-windows-tree/a-windows-tree-calls";
import {
    treeFilterAtom,
    showHandlesAtom,
    hideInvisibleAtom,
    displayedCountAtom,
    autoHighlightAtom,
    selectedHandleAtom,
} from "./s-windows-tree-state";
import { useFilter } from "./2-2-use-filter";

export function WindowTreeToolbar() {
    const { loading } = useSnapshot(windowTreeStore);
    const [filter, setFilter] = useAtom(treeFilterAtom);

    useFilter();

    return (
        <div className="bg-app-background/10">
            <div className={"mx-1 my-0.5 bg-background border rounded"}>

                <div className="px-2 py-1.5 border-b flex items-center gap-x-1 flex-wrap">
                    <Button className="h-7 rounded" size="xs" variant="outline" onClick={() => void refreshWindowTree()} disabled={loading} title="Refresh windows">
                        <RefreshCw className={classNames("size-3.5 text-muted-foreground", loading && "animate-spin")} />
                    </Button>

                    <div className="relative flex-1 min-w-40">
                        <Input
                            className="h-7 pr-7 text-xs rounded"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter by class or title..."
                        />

                        <Button
                            className="absolute inset-y-0 right-1 my-auto pb-0.5"
                            size="icon-xs"
                            variant="ghost"
                            disabled={!filter}
                            onClick={() => setFilter("")}
                            title="Clear filter"
                            aria-label="Clear filter"
                            type="button"
                        >
                            <X className="size-3.5 text-muted-foreground" />
                        </Button>
                    </div>

                    <AutoHighlightToggle />
                    <TreeOptionsPopover />
                </div>
            </div>
        </div>
    );
}

function AutoHighlightToggle() {
    const [autoHighlight, setAutoHighlight] = useAtom(autoHighlightAtom);
    const selectedHandle = useAtomValue(selectedHandleAtom);

    return (
        <Label
            className="shrink-0 text-xs font-normal text-muted-foreground cursor-pointer gap-1"
            title="Highlight the selected window on screen"
        >
            <span className="pb-0.5 whitespace-nowrap">Auto-highlight:</span>
            <Switch
                className="scale-75"
                checked={autoHighlight}
                onCheckedChange={(checked) => {
                    setAutoHighlight(checked);
                    if (checked) {
                        void maybeHighlightSelectedWindow(selectedHandle);
                    } else {
                        void hideWindowHighlight();
                    }
                }}
            />
        </Label>
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
                <Button className="size-7 rounded" size="icon-xs" variant="outline" title="Tree options" type="button">
                    <Settings className="size-3.5 text-muted-foreground" />
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-auto min-w-36">

                <div className="mx-auto text-xs font-semibold">
                    Tree options
                </div>

                <div className="-mx-2 h-px border-t border-border"></div>

                <div className="py-1 flex flex-col gap-2">
                    <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={showHandles} onCheckedChange={(v) => setShowHandles(v === true)} />
                        Handles
                    </label>

                    <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={hideInvisible} onCheckedChange={(v) => setHideInvisible(v === true)} />
                        Hide invisible
                    </label>
                </div>

                <div className="-mx-2 h-px border-t border-border"></div>

                <div className="text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span>Total windows</span>
                    <span className="tabular-nums text-[11px]">{count}</span>

                    <span>Displayed</span>
                    <span className="tabular-nums text-[11px]">{displayed}</span>
                </div>

            </PopoverContent>
        </Popover>
    );
}
