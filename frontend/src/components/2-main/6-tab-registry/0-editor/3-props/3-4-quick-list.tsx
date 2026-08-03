import { Fragment } from "react";
import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { Folder, Info } from "lucide-react";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import {
    type RegGroup,
    type RegItem,
    type RegNode,
    VALUE_TYPE_LABELS,
    collectGroupItems,
    formatItemKeyPath,
    isRegGroup,
    isRegSeparator,
    itemHasSubKey,
    itemLabel,
    valueDisplayName,
} from "../../a-atoms/9-types-registry";
import {
    type RegReadState,
    doAsyncRegReadGroupAtom,
    doAsyncRegReadItemAtom,
    doAsyncRegWriteGroupAtom,
    doAsyncRegWriteItemAtom,
    readMatchesDesired,
    registryReadStore,
} from "../../a-atoms/2-run-registry";

const CHILD_INDENT = 16;
const labelClasses = "text-[0.65rem] font-normal text-foreground/70 select-none";
const actionButtonClass =
    "px-1.5 h-4.5 font-normal text-[0.65rem] text-sky-800 bg-sky-200 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80 border-sky-500/60";

export function QuickAccessList({ nodes }: { nodes: readonly RegNode[]; }) {
    if (nodes.length === 0) {
        return null;
    }

    return (
        <div className="">
            <div className={labelClasses}>
                Quick actions list
            </div>
            <div className="p-2 border rounded flex flex-col gap-1.5">
                <QuickAccessItems nodes={nodes} depth={0} />
            </div>
        </div>
    );
}

function QuickAccessItems({ nodes, depth }: { nodes: readonly RegNode[]; depth: number; }) {
    if (nodes.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1">
            {nodes.map(
                (node, index) => (
                    <QuickAccessItem
                        key={node.uid ?? (isRegGroup(node) ? node.name : isRegSeparator(node) ? `sep-${index}` : itemLabel(node))}
                        node={node}
                        depth={depth}
                    />
                )
            )}
        </div>
    );
}

function QuickAccessItem({ node, depth }: { node: RegNode; depth: number; }) {
    const indentStyle = { paddingLeft: depth * CHILD_INDENT };

    if (isRegSeparator(node)) {
        return (
            <div className="w-full min-h-1 flex items-center" style={indentStyle}>
                <span className="w-full border-t border-foreground/40" />
            </div>
        );
    }

    if (isRegGroup(node)) {
        return (
            <div className="select-none flex flex-col gap-0.5 cursor-default">
                <div
                    className="pr-1 h-4.5 pb-0.5 has-[button:hover]:**:data-qa-name:text-blue-600 dark:has-[button:hover]:**:data-qa-name:text-blue-400 flex items-center justify-between gap-0.5"
                    style={indentStyle}
                >
                    <div className="min-w-0 flex items-center gap-x-1.5">
                        <Folder className="shrink-0 size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                        <span data-qa-name className="text-[0.65rem] transition-colors truncate">
                            {node.name || <span className="text-muted-foreground italic">(unnamed)</span>}
                        </span>
                    </div>
                    <QuickAccessGroupButtons group={node} />
                </div>
                <QuickAccessItems nodes={node.items} depth={depth + 1} />
            </div>
        );
    }

    return (
        <div
            className="pr-1 has-[button:hover]:**:data-qa-name:text-blue-600 dark:has-[button:hover]:**:data-qa-name:text-blue-400 select-none flex items-center justify-between gap-0.5"
            style={indentStyle}
        >
            <div className="min-w-0 flex items-center gap-x-0.5">
                <SymbolAppRegedit className="shrink-0 size-3.5 opacity-70" />
                <QuickAccessItemTooltip item={node} />
                <span data-qa-name className="text-[0.75rem] transition-colors truncate">
                    {itemLabel(node) || <span className="text-muted-foreground italic">(unnamed)</span>}
                </span>
                <ReadStateDot item={node} />
            </div>
            <QuickAccessItemButtons item={node} />
        </div>
    );
}

/** Compact match indicator, shown only once a value has been read. */
function ReadStateDot({ item }: { item: RegItem; }) {
    const { byUid } = useSnapshot(registryReadStore);
    const read: RegReadState | undefined = item.uid ? byUid[item.uid] : undefined;

    if (!read || read.loading) {
        return null;
    }

    const { title, className } = readStateLook(read, item);

    return (
        <span
            className={classNames("ml-1 shrink-0 size-1.5 rounded-full", className)}
            title={title}
            aria-label={title}
        />
    );
}

function readStateLook(read: RegReadState, item: RegItem): { title: string; className: string; } {
    if (read.error) {
        return { title: read.error, className: "bg-destructive" };
    }
    if (!read.exists) {
        return { title: "Not present in the registry", className: "bg-amber-500" };
    }
    if (readMatchesDesired(read, item)) {
        return { title: "Current value matches the new value", className: "bg-emerald-500" };
    }
    return { title: `Current value differs: ${read.value ?? ""}`, className: "bg-orange-500" };
}

function QuickAccessGroupButtons({ group }: { group: RegGroup; }) {
    const readGroup = useSetAtom(doAsyncRegReadGroupAtom);
    const writeGroup = useSetAtom(doAsyncRegWriteGroupAtom);
    const uid = group.uid;
    const enabled = collectGroupItems(group).length > 0 && !!uid;

    return (
        <div className="shrink-0 flex items-center gap-1">
            <Button
                className={actionButtonClass}
                variant="secondary"
                size="xs"
                type="button"
                disabled={!enabled}
                title={enabled ? "Read every value in this group" : "Add registry values to this group first"}
                onClick={() => uid && void readGroup(uid)}
            >
                Read
            </Button>
            <Button
                className={actionButtonClass}
                variant="secondary"
                size="xs"
                type="button"
                disabled={!enabled}
                title={enabled ? "Write every value in this group" : "Add registry values to this group first"}
                onClick={() => uid && void writeGroup(uid)}
            >
                Write
            </Button>
        </div>
    );
}

function QuickAccessItemButtons({ item }: { item: RegItem; }) {
    const readItem = useSetAtom(doAsyncRegReadItemAtom);
    const writeItem = useSetAtom(doAsyncRegWriteItemAtom);
    const uid = item.uid;
    const enabled = itemHasSubKey(item) && !!uid;

    return (
        <div className="shrink-0 flex items-center gap-1">
            <Button
                className={actionButtonClass}
                variant="secondary"
                size="xs"
                type="button"
                disabled={!enabled}
                title={enabled ? "Read this value from the registry" : "Set a key path first"}
                onClick={() => uid && void readItem(uid)}
            >
                Read
            </Button>
            <Button
                className={actionButtonClass}
                variant="secondary"
                size="xs"
                type="button"
                disabled={!enabled}
                title={enabled ? "Write this value to the registry" : "Set a key path first"}
                onClick={() => uid && void writeItem(uid)}
            >
                Write
            </Button>
        </div>
    );
}

function QuickAccessItemTooltip({ item }: { item: RegItem; }) {
    const rows = quickAccessItemPropertyRows(item);
    if (rows.length === 0) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className="ml-px text-muted-foreground/70 hover:text-muted-foreground inline-flex items-center"
                        type="button"
                        aria-label="Value properties"
                    >
                        <Info className="size-2.5" />
                    </button>
                </TooltipTrigger>

                <TooltipContent side="top" className="max-w-80">
                    <div className="text-xs grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">
                        {rows.map(
                            (row) => (
                                <Fragment key={row.label}>
                                    <span className="font-semibold whitespace-nowrap">{row.label}</span>
                                    <span className="break-all">{row.value}</span>
                                </Fragment>
                            )
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/** Filled-in properties only; the name is shown in the row UI instead. */
function quickAccessItemPropertyRows(item: RegItem): { label: string; value: string; }[] {
    const rows: { label: string; value: string; }[] = [];

    function add(label: string, value: string | undefined | null) {
        const trimmed = value?.trim();
        if (trimmed) {
            rows.push({ label, value: trimmed });
        }
    }

    add("Key", formatItemKeyPath(item));
    rows.push({ label: "Value", value: valueDisplayName(item.valueName) });
    rows.push({ label: "Type", value: VALUE_TYPE_LABELS[item.valueType] });
    add("New value", item.newValue);
    add("Comment", item.comment);

    if (item.view === "32" || item.view === "64") {
        add("View", `${item.view}-bit`);
    }
    if (item.requireElevated) {
        add("Require elevated", "Yes");
    }

    return rows;
}
