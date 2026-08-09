import { Fragment } from "react";
import { FileIcon, Folder, Info } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { labelClasses } from "@/components/2-main/a-shared/props-1-shared-controls";
import { type CopyGroup, type CopyNode, type CopyOpItem, collectGroupItems, findByUid, isCopyGroup, isCopySeparator, itemLabel } from "../a-atoms/9-types-copy";
import { copyEditorStore } from "../a-atoms/0-copy-local-storage";
import { runCopyGroup, runCopyItem } from "../a-atoms/2-run-copy";

const CHILD_INDENT = 16;
const copyButtonClasses =
    "px-1.5 h-4.5 font-normal text-[0.65rem] text-sky-800 bg-sky-200 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80 border-sky-500/60";

export function QuickAccessList({ nodes }: { nodes: readonly CopyNode[]; }) {
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

function QuickAccessItems({ nodes, depth }: { nodes: readonly CopyNode[]; depth: number; }) {
    if (nodes.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1">
            {nodes.map(
                (node, index) => (
                    <QuickAccessItem
                        key={node.uid ?? (isCopyGroup(node) ? node.name : isCopySeparator(node) ? `sep-${index}` : itemLabel(node))}
                        node={node}
                        depth={depth}
                    />
                )
            )}
        </div>
    );
}

function QuickAccessItem({ node, depth }: { node: CopyNode; depth: number; }) {
    const indentStyle = { paddingLeft: depth * CHILD_INDENT };

    if (isCopySeparator(node)) {
        return (
            <div className="w-full min-h-1 flex items-center" style={indentStyle}>
                <span className="w-full border-t border-foreground/40" />
            </div>
        );
    }

    if (isCopyGroup(node)) {
        return (
            <div className="select-none flex flex-col gap-0.5 cursor-default">
                <div
                    className="pr-1 pb-0.5 h-4.5 has-[button:hover]:**:data-qa-name:text-blue-600 dark:has-[button:hover]:**:data-qa-name:text-blue-400 flex items-center justify-between gap-0.5"
                    style={indentStyle}
                >
                    <div className="min-w-0 flex items-center gap-x-1.5">
                        <Folder className="shrink-0 size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                        <span data-qa-name className="text-[0.65rem] transition-colors truncate">
                            {node.name || <span className="text-muted-foreground italic">(unnamed)</span>}
                        </span>
                    </div>
                    <QuickAccessCopyGroupButton group={node} />
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
                <FileIcon className="shrink-0 size-3.5 text-foreground/70" />
                <QuickAccessItemTooltip item={node} />
                <span data-qa-name className="text-[0.75rem] transition-colors truncate">
                    {itemLabel(node) || <span className="text-muted-foreground italic">(unnamed)</span>}
                </span>
            </div>
            <QuickAccessCopyItemButton item={node} />
        </div>
    );
}

function QuickAccessCopyGroupButton({ group }: { group: CopyGroup; }) {
    const canCopy = collectGroupItems(group).length > 0;
    const uid = group.uid;

    return (
        <Button
            className={copyButtonClasses}
            variant="secondary"
            size="xs"
            type="button"
            disabled={!canCopy || !uid}
            title={canCopy
                ? "Copy all items in this group"
                : "Add copy items to this group first"}
            onClick={() => {
                if (!uid) {
                    return;
                }
                const loc = findByUid(copyEditorStore.config, uid);
                if (loc?.kind === "group") {
                    runCopyGroup(loc.group);
                }
            }}
        >
            Copy group
        </Button>
    );
}

function QuickAccessCopyItemButton({ item }: { item: CopyOpItem; }) {
    const canCopy = !!(item.sourceFile.trim() && item.destFolder.trim());
    const uid = item.uid;

    return (
        <Button
            className={copyButtonClasses}
            variant="secondary"
            size="xs"
            type="button"
            disabled={!canCopy || !uid}
            title={canCopy
                ? "Copy this file as if selected from the tree"
                : "Set a source file and destination folder first"}
            onClick={() => {
                if (!uid) {
                    return;
                }
                const loc = findByUid(copyEditorStore.config, uid);
                if (loc?.kind === "item") {
                    runCopyItem(loc.item);
                }
            }}
        >
            Copy
        </Button>
    );
}

function QuickAccessItemTooltip({ item }: { item: CopyOpItem; }) {
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
                        aria-label="Item properties"
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

/** Filled-in properties only; name is shown in the row UI instead. */
function quickAccessItemPropertyRows(item: CopyOpItem): { label: string; value: string; }[] {
    const rows: { label: string; value: string; }[] = [];

    function add(label: string, value: string | undefined | null) {
        const trimmed = value?.trim();
        if (trimmed) {
            rows.push({ label, value: trimmed });
        }
    }

    add("Source", item.sourceFile);
    add("Destination", item.destFolder);
    add("Comment", item.comment);

    if (item.stopDpAgent) {
        add("Stop DpAgent", "Yes");
    }
    if (item.requireElevated) {
        add("Require elevated", "Yes");
    }
    if (item.renameLocked) {
        add("Rename if locked", "Yes");
    }

    return rows;
}
