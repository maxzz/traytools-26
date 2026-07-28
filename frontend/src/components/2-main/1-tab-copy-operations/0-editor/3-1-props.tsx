import { Fragment, type ReactNode } from "react";
import { useSnapshot } from "valtio";
import { FileIcon, Folder, Info } from "lucide-react";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { PathInput } from "@/components/2-main/a-shared/path-input";
import {
    type CopyGroup,
    type CopyNode,
    type CopyOpItem,
    collectGroupItems,
    findByUid,
    findTopLevelGroup,
    isCopyGroup,
    itemLabel,
    sourceFileBaseName,
} from "../a-atoms/9-types-copy";
import { patchSelectedGroup, patchSelectedItem } from "../a-atoms/use-selected-node";
import { copyEditorStore } from "../a-atoms/0-copy-local-storage";
import { runCopyGroup, runCopyItem } from "../a-atoms/2-run-copy";

export function PropsFor_Root() {
    const { config } = useSnapshot(copyEditorStore, { sync: true });
    const groups = config.groups as CopyGroup[];

    return (<>
        <p className="text-muted-foreground">
            Root of the copy operations tree. Add groups here. Groups can contain copy items and nested groups
            in one ordered list. Groups and items can be reordered by drag-and-drop. This node cannot be moved or deleted.
        </p>

        <QuickAccessList nodes={groups} />
    </>);
}

export function PropsFor_Group({ group }: { group: CopyGroup; }) {
    const loc = group.uid ? findByUid(copyEditorStore.config, group.uid) : null;
    const isTopLevel = loc?.kind === "group" && loc.parent === null;
    const parent = loc?.kind === "group" ? loc.parent : null;
    const topLevel = group.uid ? findTopLevelGroup(copyEditorStore.config, group.uid) : null;
    const selfHasItems = collectGroupItems(group).length > 0;
    const parentHasItems = parent ? collectGroupItems(parent).length > 0 : false;
    const topLevelHasItems = topLevel ? collectGroupItems(topLevel).length > 0 : false;
    // When the parent is already the root-level group, "top-level" would be redundant.
    const showTopLevel = !isTopLevel && !!topLevel && topLevel.uid !== parent?.uid;

    return (<>
        <div className="-my-2 self-end flex items-center gap-2">
            {showTopLevel && (
                <CopyActionButton
                    label="Copy top-level group"
                    disabled={!topLevelHasItems}
                    title="Copy all items in the root-level group that contains this group"
                    onClick={() => copyLiveGroup(topLevel?.uid)}
                />
            )}
            {!isTopLevel && (
                <CopyActionButton
                    label="Copy parent group"
                    disabled={!parentHasItems}
                    title="Copy all items in this group's parent (including nested groups)"
                    onClick={() => copyLiveGroup(parent?.uid)}
                />
            )}
            <CopyActionButton
                label="Copy group"
                disabled={!selfHasItems}
                onClick={() => copyLiveGroup(group.uid)}
            />
        </div>

        <LabelAndField label="Group name">
            <Input
                className="h-7"
                value={group.name}
                onChange={(e) => patchSelectedGroup((g) => { g.name = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>

        <CopyRunFlags flags={group} onPatch={patchSelectedGroup} />

        <QuickAccessList nodes={group.items} />
    </>);
}

export function PropsFor_Item({ item, group }: { item: CopyOpItem; group: CopyGroup; }) {
    const topLevel = item.uid ? findTopLevelGroup(copyEditorStore.config, item.uid) : null;
    const parentHasItems = collectGroupItems(group).length > 0;
    const topLevelHasItems = topLevel ? collectGroupItems(topLevel).length > 0 : false;
    // When the parent is already the root-level group, "top-level" would be redundant.
    const showTopLevel = !!topLevel && topLevel.uid !== group.uid;

    return (<>
        <div className="-my-2 self-end flex items-center gap-2">
            {showTopLevel && (
                <CopyActionButton
                    label="Copy top-level group"
                    disabled={!topLevelHasItems}
                    title="Copy all items in the root-level group that contains this item"
                    onClick={() => copyLiveGroup(topLevel?.uid)}
                />
            )}
            <CopyActionButton
                label="Copy parent group"
                disabled={!parentHasItems}
                title="Copy all items in this item's parent group (including nested groups)"
                onClick={() => copyLiveGroup(group.uid)}
            />
            <CopyActionButton
                label="Copy file"
                disabled={!item.sourceFile.trim() || !item.destFolder.trim()}
                onClick={() => copyLiveItem(item.uid)}
            />
        </div>

        <LabelAndField label="Source file">
            <PathInput
                kind="file"
                value={item.sourceFile}
                onChange={(path) => patchSelectedItem((it) => { it.sourceFile = path; })}
                showReveal
            />
        </LabelAndField>

        <CopyRunFlags flags={item} onPatch={patchSelectedItem} />

        <LabelAndField label="Destination folder">

            <PathInput
                kind="folder"
                value={item.destFolder}
                onChange={(path) => patchSelectedItem((it) => { it.destFolder = path; })}
                showReveal
            />
        </LabelAndField>

        <OperationNameField item={item} />
    </>);
}

// Copy action buttons

function copyLiveGroup(uid?: string) {
    if (!uid) {
        return;
    }
    const loc = findByUid(copyEditorStore.config, uid);
    if (loc?.kind === "group") {
        runCopyGroup(loc.group);
    }
}

function copyLiveItem(uid?: string) {
    if (!uid) {
        return;
    }
    const loc = findByUid(copyEditorStore.config, uid);
    if (loc?.kind === "item") {
        runCopyItem(loc.item);
    }
}

function CopyActionButton({ label, disabled, title, onClick }: { label: string; disabled: boolean; title?: string; onClick: () => void; }) {
    return (
        <Button
            className="font-normal text-sky-800 bg-sky-200 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80 border-sky-500/60"
            variant="secondary"
            size="xs"
            disabled={disabled}
            title={title}
            onClick={onClick}
            type="button"
        >
            {label}
        </Button>
    );
}

// Copy run flags

type CopyRunFlags = Pick<CopyGroup, "stopDpAgent" | "requireElevated" | "renameLocked">;

function CopyRunFlags({ flags, onPatch, }: { flags: CopyRunFlags; onPatch: (fn: (target: CopyRunFlags) => void) => void; }) {
    return (
        <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <FlagSwitch
                label="Stop DpAgent before copy"
                hint="If DpAgent is running, stop it and wait until it is confirmed stopped before copying any items in this group."
                checked={!!flags.stopDpAgent}
                onCheckedChange={(v) => onPatch((t) => { t.stopDpAgent = v; })}
            />

            <FlagSwitch
                label="Require elevated privileges"
                hint="Use when destinations include protected folders such as Program Files."
                checked={!!flags.requireElevated}
                onCheckedChange={(v) => onPatch((t) => { t.requireElevated = v; })}
            />

            <FlagSwitch
                label="Rename destination if locked"
                hint="If copy fails with Access Denied, rename the locked destination to name_locked_N.ext and retry the copy."
                checked={!!flags.renameLocked}
                onCheckedChange={(v) => onPatch((t) => { t.renameLocked = v; })}
            />
        </div>
    );
}

function FlagSwitch({ label, hint, checked, onCheckedChange, }: { label: string; hint: string; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    return (
        <Label className="font-normal text-[0.65rem] text-muted-foreground flex items-center gap-1 cursor-pointer" title={hint}>
            <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
            <span className="mt-0.5">{label}</span>
        </Label>
    );
}

function OperationNameField({ item }: { item: CopyOpItem; }) {
    const baseName = sourceFileBaseName(item.sourceFile);

    return (
        <LabelAndField label="Operation name">
            <Input
                value={item.name ?? baseName}
                onChange={(e) => {
                    const next = e.target.value;
                    patchSelectedItem((it) => {
                        const base = sourceFileBaseName(it.sourceFile);
                        if (next === base) {
                            delete it.name;
                        } else {
                            it.name = next;
                        }
                    });
                }}
                onBlur={() => {
                    if (!item.name?.trim()) {
                        patchSelectedItem((it) => { delete it.name; });
                    }
                }}
                placeholder={baseName || "Operation name"}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

function LabelAndField({ label, children }: { label: string; children: ReactNode; }) {
    // Keep Label and Input as siblings — Label's select-none must not wrap the input
    // or caret placement breaks when typing at the start of the value.
    return (
        <Label className="text-xs font-normal whitespace-nowrap flex flex-col items-start gap-0.5">
            <div className="text-[0.65rem] text-muted-foreground whitespace-nowrap">
                {label}
            </div>
            {children}
        </Label >
    );
}

// Quick actions list (mirrors Tools Menu Editor quick access)

const CHILD_INDENT = 16;
const labelClasses = "text-[0.65rem] font-normal text-foreground/70 select-none";

function QuickAccessList({ nodes }: { nodes: readonly CopyNode[]; }) {
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
                (node) => (
                    <QuickAccessItem
                        key={node.uid ?? (isCopyGroup(node) ? node.name : itemLabel(node))}
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

    if (isCopyGroup(node)) {
        return (
            <div className="select-none flex flex-col gap-1 cursor-default">
                <div className="pr-1 h-4 flex items-center gap-x-1.5" style={indentStyle}>
                    <Folder className="shrink-0 size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                    <span className="text-[0.65rem] truncate">
                        {node.name || <span className="text-muted-foreground italic">(unnamed)</span>}
                    </span>
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
            <QuickAccessCopyButton item={node} />
        </div>
    );
}

function QuickAccessCopyButton({ item }: { item: CopyOpItem; }) {
    const canCopy = !!(item.sourceFile.trim() && item.destFolder.trim());
    const uid = item.uid;

    return (
        <Button
            className="px-1.5 h-4.5 font-normal text-[0.65rem] text-sky-800 bg-sky-200 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80 border-sky-500/60"
            variant="secondary"
            size="xs"
            type="button"
            disabled={!canCopy || !uid}
            title={canCopy
                ? "Copy this file as if selected from the tree"
                : "Set a source file and destination folder first"}
            onClick={() => copyLiveItem(uid)}
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
