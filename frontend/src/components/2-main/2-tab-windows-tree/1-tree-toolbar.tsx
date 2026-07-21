import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { RefreshCw, Settings, X } from "lucide-react";
import { IconCollapse } from "@/ui/icons/normal";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { useFilter } from "./2-2-use-filter";
import { ProcessHistoryNav } from "./1-1-process-history-nav";
import { windowTreeStore, refreshWindowTree, maybeHighlightSelectedWindow, hideWindowHighlight } from "./a-windows-tree-calls";
import { treeFilterAtom, showHandlesAtom, hideInvisibleAtom, groupByProcessAtom, showProcessIdsAtom, displayedCountAtom, selectedHandleAtom, filteredTreeAtom, treeExpandRevisionAtom } from "./s-windows-tree-state";

export function WindowTreeToolbar() {
    const { loading } = useSnapshot(windowTreeStore);
    const [filter, setFilter] = useAtom(treeFilterAtom);

    useFilter();

    return (
        <div className="bg-app-background/10">
            <div className={"mx-1 h-9 bg-background border rounded"}>

                <div className="px-2 py-1.5 border-b flex items-center gap-x-1 flex-wrap">
                    <Button className="size-6 rounded" size="xs" variant="outline" onClick={() => void refreshWindowTree()} disabled={loading} title="Refresh windows">
                        <RefreshCw className={classNames("size-3 text-muted-foreground", loading && "animate-spin")} />
                    </Button>

                    <div className="flex-1 relative min-w-40">
                        <Input
                            className="pr-7 h-6 text-xs rounded"
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

                    <ProcessHistoryNav />
                    <AutoHighlightToggle />
                    <CollapseToTopLevelButton />
                    <TreeOptionsPopover />
                </div>
            </div>
        </div>
    );
}

function AutoHighlightToggle() {
    const { windowHighlight } = useSnapshot(appSettings);
    const selectedHandle = useAtomValue(selectedHandleAtom);

    return (
        <Label className="shrink-0 ml-4 text-xs font-normal text-muted-foreground gap-0 cursor-pointer" title="Highlight the selected window on screen">
            <span className="-mr-0.5 pb-0.5 whitespace-nowrap">
                Auto-highlight:
            </span>
            <Switch
                className="scale-65"
                checked={windowHighlight.autoHighlight}
                onCheckedChange={(checked) => {
                    appSettings.windowHighlight.autoHighlight = checked;
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

function CollapseToTopLevelButton() {
    const setFilteredTree = useSetAtom(filteredTreeAtom);
    const setExpandRevision = useSetAtom(treeExpandRevisionAtom);

    return (
        <Button
            className="size-6 rounded"
            size="icon-xs"
            variant="outline"
            title="Collapse to top-level windows"
            aria-label="Collapse to top-level windows"
            type="button"
            onClick={() => {
                // Keep only the root expanded so first-level windows stay visible;
                // deeper nodes remain in the tree but are collapsed/hidden.
                setFilteredTree((prev) => ({
                    ...prev,
                    expandIds: prev.tree ? ["root"] : [],
                }));
                setExpandRevision((n) => n + 1);
            }}
        >
            <IconCollapse className="size-3.5 text-muted-foreground" />
        </Button>
    );
}

function TreeOptionsPopover() {
    const { count } = useSnapshot(windowTreeStore);
    const { windowHighlight } = useSnapshot(appSettings);
    const [showHandles, setShowHandles] = useAtom(showHandlesAtom);
    const [hideInvisible, setHideInvisible] = useAtom(hideInvisibleAtom);
    const [groupByProcess, setGroupByProcess] = useAtom(groupByProcessAtom);
    const [showProcessIds, setShowProcessIds] = useAtom(showProcessIdsAtom);
    const displayed = useAtomValue(displayedCountAtom);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button className="size-6 rounded" size="icon-xs" variant="outline" title="Tree options" type="button">
                    <Settings className="size-3.5 text-muted-foreground" />
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-auto min-w-56">

                <div className="mx-auto text-xs font-semibold">
                    Tree options
                </div>

                <Separator />

                <div className="py-1 flex flex-col gap-2">
                    <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={showHandles} onCheckedChange={(v) => setShowHandles(v === true)} />
                        Show winsow handles
                    </label>

                    <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={hideInvisible} onCheckedChange={(v) => setHideInvisible(v === true)} />
                        Hide invisible windows
                    </label>

                    <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={groupByProcess} onCheckedChange={(v) => setGroupByProcess(v === true)} />
                        Group windows by process name
                    </label>

                    <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer" title="Show process IDs next to process-name folders when grouping is on">
                        <Checkbox
                            checked={showProcessIds}
                            onCheckedChange={(v) => setShowProcessIds(v === true)}
                            disabled={!groupByProcess}
                        />
                        Show process IDs
                    </label>
                </div>

                <Separator />

                <div className="flex flex-col">
                    <div className="pb-1 text-xs font-semibold">
                        Highlight Window Rectangle
                    </div>
                    <div className="pb-1 flex items-center gap-1">
                        Blink:
                        <OptionNumber
                            label="count"
                            title="Number of highlight blinks (1-10)"
                            value={windowHighlight.blinkCount}
                            min={1}
                            max={10}
                            onChange={(v) => { appSettings.windowHighlight.blinkCount = v; }}
                        />
                        <OptionNumber
                            label="border"
                            title="Highlight border width in pixels (1-20)"
                            value={windowHighlight.borderWidth}
                            min={1}
                            max={20}
                            onChange={(v) => { appSettings.windowHighlight.borderWidth = v; }}
                        />
                        <label className="text-xs select-none flex items-center justify-between gap-2" title="Highlight border color">
                            <input
                                type="color"
                                title="Highlight border color"
                                className="p-0 h-6 w-8 bg-transparent border border-border rounded cursor-pointer"
                                value={normalizeHexColor(windowHighlight.borderColor)}
                                onChange={(e) => {
                                    appSettings.windowHighlight.borderColor = normalizeHexColor(e.target.value);
                                }}
                            />
                        </label>
                    </div>

                    <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer" title="Show empty bounds / off-screen notice on the tree row">
                        <Checkbox
                            checked={windowHighlight.showBoundsNotice}
                            onCheckedChange={(v) => { appSettings.windowHighlight.showBoundsNotice = v === true; }}
                        />
                        Show inline empty bounds notice
                    </label>
                </div>

                <Separator />

                <div className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                    <span>Total windows</span>
                    <span className="tabular-nums text-[11px]">{count}</span>

                    <span>Displayed</span>
                    <span className="tabular-nums text-[11px]">{displayed}</span>
                </div>

            </PopoverContent>
        </Popover>
    );
}

function Separator() {
    return <div className="-mx-2 h-px border-t border-border" />;
}

function OptionNumber({ label, title, value, min, max, onChange, }: { label: string; title?: string; value: number; min: number; max: number; onChange: (value: number) => void; }) {
    return (
        <label className="text-xs select-none flex items-center justify-between gap-0.5" title={title}>
            <span>{label}</span>
            <Input
                type="number"
                className="px-1.5 h-6 w-10 text-xs tabular-nums"
                min={min}
                max={max}
                value={value}
                onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) {
                        return;
                    }
                    onChange(Math.max(min, Math.min(max, Math.round(n))));
                }}
            />
        </label>
    );
}

function normalizeHexColor(color: string): string {
    const input = String(color ?? "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(input)) {
        return input.toLowerCase();
    }
    return "#ff0000";
}
