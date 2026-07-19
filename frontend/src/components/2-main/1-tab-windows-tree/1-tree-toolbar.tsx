import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { RefreshCw, Settings, X } from "lucide-react";
import { classNames } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { IconCollapse } from "@/ui/icons/normal";
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
    selectedHandleAtom,
    filteredTreeAtom,
    treeExpandRevisionAtom,
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
                    <CollapseToTopLevelButton />
                    <TreeOptionsPopover />
                </div>
            </div>
        </div>
    );
}

function CollapseToTopLevelButton() {
    const setFilteredTree = useSetAtom(filteredTreeAtom);
    const setExpandRevision = useSetAtom(treeExpandRevisionAtom);

    return (
        <Button
            className="size-7 rounded"
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

function AutoHighlightToggle() {
    const { windowHighlight } = useSnapshot(appSettings);
    const selectedHandle = useAtomValue(selectedHandleAtom);

    return (
        <Label
            className="shrink-0 text-xs font-normal text-muted-foreground cursor-pointer gap-1"
            title="Highlight the selected window on screen"
        >
            <span className="pb-0.5 whitespace-nowrap">Auto-highlight:</span>
            <Switch
                className="scale-75"
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

function TreeOptionsPopover() {
    const { count } = useSnapshot(windowTreeStore);
    const { windowHighlight } = useSnapshot(appSettings);
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

            <PopoverContent align="end" className="w-auto min-w-56">

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

                <div className="py-1 text-xs font-semibold">
                    Highlight
                </div>

                <div className="pb-1 flex flex-col gap-2">
                    <OptionNumber
                        label="Blink count"
                        title="Number of highlight blinks (1–10)"
                        value={windowHighlight.blinkCount}
                        min={1}
                        max={10}
                        onChange={(v) => { appSettings.windowHighlight.blinkCount = v; }}
                    />
                    <OptionNumber
                        label="Border width"
                        title="Highlight border width in pixels (1–20)"
                        value={windowHighlight.borderWidth}
                        min={1}
                        max={20}
                        onChange={(v) => { appSettings.windowHighlight.borderWidth = v; }}
                    />
                    <label className="text-xs select-none flex items-center justify-between gap-2" title="Highlight border color">
                        <span>Border color</span>
                        <input
                            type="color"
                            className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                            value={normalizeHexColor(windowHighlight.borderColor)}
                            onChange={(e) => {
                                appSettings.windowHighlight.borderColor = normalizeHexColor(e.target.value);
                            }}
                        />
                    </label>
                    <label className="text-xs select-none flex items-center gap-1.5 cursor-pointer" title="Show empty bounds / off-screen notice on the tree row">
                        <Checkbox
                            checked={windowHighlight.showBoundsNotice}
                            onCheckedChange={(v) => { appSettings.windowHighlight.showBoundsNotice = v === true; }}
                        />
                        Show bounds notice
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

function OptionNumber({
    label,
    title,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    title?: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="text-xs select-none flex items-center justify-between gap-2" title={title}>
            <span>{label}</span>
            <Input
                type="number"
                className="h-6 w-14 px-1.5 text-xs tabular-nums"
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
