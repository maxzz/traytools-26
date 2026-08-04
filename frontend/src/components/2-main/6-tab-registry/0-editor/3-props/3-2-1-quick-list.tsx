import { Fragment } from "react";
import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { Folder, Info } from "lucide-react";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { labelClasses } from "@/components/2-main/a-shared/props-field-ui";
import {
    type RegGroup,
    type RegItem,
    type RegNode,
    type RegValue,
    VALUE_TYPE_LONG_LABELS,
    countGroupValues,
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
    doAsyncRegReadValueAtom,
    doAsyncRegWriteGroupAtom,
    doAsyncRegWriteItemAtom,
    doAsyncRegWriteValueAtom,
    readMatchesDesired,
    registryReadStore,
} from "../../a-atoms/2-run-registry";

const CHILD_INDENT = 16;
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

    const values = node.values ?? [];

    return (
        <div className="flex flex-col gap-0.5">
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
                    <ItemReadStateDot item={node} />
                </div>
                <QuickAccessItemButtons item={node} />
            </div>

            {/* A single value is already described by the key row above. */}
            {values.length > 1 && values.map(
                (value) => (
                    <QuickAccessValueRow
                        key={value.uid}
                        item={node}
                        value={value}
                        depth={depth + 1}
                    />
                )
            )}
        </div>
    );
}

function QuickAccessValueRow({ item, value, depth }: { item: RegItem; value: RegValue; depth: number; }) {
    return (
        <div
            className="pr-1 has-[button:hover]:**:data-qa-name:text-blue-600 dark:has-[button:hover]:**:data-qa-name:text-blue-400 select-none flex items-center justify-between gap-0.5"
            style={{ paddingLeft: depth * CHILD_INDENT }}
        >
            <div className="min-w-0 flex items-center gap-x-0.5">
                <span data-qa-name className="text-[0.7rem] text-muted-foreground transition-colors truncate">
                    {valueDisplayName(value.valueName)}
                </span>
                <ReadStateDot value={value} />
            </div>
            <QuickAccessValueButtons item={item} value={value} />
        </div>
    );
}

/** Compact match indicator, shown only once a value has been read. */
function ReadStateDot({ value }: { value: RegValue; }) {
    const { byUid } = useSnapshot(registryReadStore);
    const read: RegReadState | undefined = value.uid ? byUid[value.uid] : undefined;

    if (!read || read.loading) {
        return null;
    }

    const { title, className } = readStateLook(read, value);

    return (
        <span
            className={classNames("ml-1 shrink-0 size-1.5 rounded-full", className)}
            title={title}
            aria-label={title}
        />
    );
}

/** One dot for the whole key: the worst state across its values. */
function ItemReadStateDot({ item }: { item: RegItem; }) {
    const { byUid } = useSnapshot(registryReadStore);
    const values = item.values ?? [];
    const reads = values.map((value) => (value.uid ? byUid[value.uid] : undefined));

    if (!reads.some((read) => read && !read.loading)) {
        return null;
    }

    const look = worstReadStateLook(reads, values);

    return (
        <span
            className={classNames("ml-1 shrink-0 size-1.5 rounded-full", look.className)}
            title={look.title}
            aria-label={look.title}
        />
    );
}

function readStateLook(read: RegReadState, value: RegValue): { title: string; className: string; } {
    if (read.error) {
        return { title: read.error, className: "bg-destructive" };
    }
    if (!read.exists) {
        return { title: "Not present in the registry", className: "bg-amber-500" };
    }
    if (readMatchesDesired(read, value)) {
        return { title: "Current value matches the new value", className: "bg-emerald-500" };
    }
    return { title: `Current value differs: ${read.value ?? ""}`, className: "bg-orange-500" };
}

/** Rank: error beats absent beats differing beats matching. */
function worstReadStateLook(
    reads: readonly (RegReadState | undefined)[],
    values: readonly RegValue[],
): { title: string; className: string; } {
    const looks = reads
        .map((read, i) => (read && !read.loading ? readStateLook(read, values[i]) : null))
        .filter((look): look is { title: string; className: string; } => !!look);

    for (const className of ["bg-destructive", "bg-amber-500", "bg-orange-500"]) {
        const found = looks.find((look) => look.className === className);
        if (found) {
            return found;
        }
    }
    return { title: "Every value read matches", className: "bg-emerald-500" };
}

function QuickAccessGroupButtons({ group }: { group: RegGroup; }) {
    const readGroup = useSetAtom(doAsyncRegReadGroupAtom);
    const writeGroup = useSetAtom(doAsyncRegWriteGroupAtom);
    const uid = group.uid;
    const enabled = countGroupValues(group) > 0 && !!uid;

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
    const many = (item.values?.length ?? 0) > 1;

    return (
        <div className="shrink-0 flex items-center gap-1">
            <Button
                className={actionButtonClass}
                variant="secondary"
                size="xs"
                type="button"
                disabled={!enabled}
                title={!enabled ? "Set a key path first" : many ? "Read every value of this key" : "Read this value from the registry"}
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
                title={!enabled ? "Set a key path first" : many ? "Write every value of this key" : "Write this value to the registry"}
                onClick={() => uid && void writeItem(uid)}
            >
                Write
            </Button>
        </div>
    );
}

function QuickAccessValueButtons({ item, value }: { item: RegItem; value: RegValue; }) {
    const readValue = useSetAtom(doAsyncRegReadValueAtom);
    const writeValue = useSetAtom(doAsyncRegWriteValueAtom);
    const uid = value.uid;
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
                onClick={() => uid && void readValue(uid)}
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
                onClick={() => uid && void writeValue(uid)}
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
                            (row, index) => (
                                <Fragment key={index}>
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

    add("Key", item.keyPath);
    for (const value of item.values ?? []) {
        rows.push({
            label: valueDisplayName(value.valueName),
            value: `${VALUE_TYPE_LONG_LABELS[value.valueType]}${value.newValue.trim() ? ` = ${value.newValue}` : ""}`,
        });
    }
    add("Comment", item.comment);

    if (item.view === "32" || item.view === "64") {
        add("View", `${item.view}-bit`);
    }
    if (item.requireElevated) {
        add("Require elevated", "Yes");
    }

    return rows;
}
