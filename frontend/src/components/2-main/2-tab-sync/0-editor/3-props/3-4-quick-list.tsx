import { type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, FileIcon, Folder, ListTree } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { labelClasses } from "@/components/2-main/a-shared/props-1-shared-controls";
import { type SyncNode, type SyncOpItem, findByUid, isSyncGroup, isSyncSeparator, itemLabel, syncDirectionName } from "../../a-atoms/9-types-sync";
import { syncEditorStore } from "../../a-atoms/0-sync-local-storage";
import { runCheck, runSyncItem } from "../../a-atoms/2-run-sync";

export function QuickAccessList({ nodes }: { nodes: readonly SyncNode[]; }) {
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

function QuickAccessItems({ nodes, depth }: { nodes: readonly SyncNode[]; depth: number; }) {
    if (nodes.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1">
            {nodes.map(
                (node, index) => (
                    <QuickAccessItem
                        key={node.uid ?? (isSyncGroup(node) ? node.name : isSyncSeparator(node) ? `sep-${index}` : itemLabel(node))}
                        node={node}
                        depth={depth}
                    />
                )
            )}
        </div>
    );
}

function QuickAccessItem({ node, depth }: { node: SyncNode; depth: number; }) {
    const indentStyle = { paddingLeft: depth * CHILD_INDENT };

    if (isSyncSeparator(node)) {
        return (
            <div className="w-full min-h-1 flex items-center" style={indentStyle}>
                <span className="w-full border-t border-foreground/40" />
            </div>
        );
    }

    if (isSyncGroup(node)) {
        return (
            <div className="select-none flex flex-col gap-0.5 cursor-default">
                <div className="pr-1 pb-0.5 h-4.5 flex items-center gap-x-1.5" style={indentStyle}>
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
        <div className="pr-1 has-[button:hover]:**:data-qa-name:text-blue-600 dark:has-[button:hover]:**:data-qa-name:text-blue-400 select-none flex items-center justify-between gap-1" style={indentStyle}>
            <div className="min-w-0 flex items-center gap-x-0.5">
                <FileIcon className="shrink-0 size-3.5 text-foreground/70" />
                <span data-qa-name className="text-[0.75rem] transition-colors truncate">
                    {itemLabel(node) || <span className="text-muted-foreground italic">(unnamed)</span>}
                </span>
            </div>

            <QuickAccessItemActions item={node} />
        </div>
    );
}

const CHILD_INDENT = 16;

function QuickAccessItemActions({ item }: { item: SyncOpItem; }) {
    const canRun = !!(item.sourceFolder.trim() && item.destFolder.trim());
    const uid = item.uid;
    const forwardName = syncDirectionName(item, "forward");
    const reverseName = syncDirectionName(item, "reverse");

    return (
        <TooltipProvider delayDuration={1000}>
            <div className="shrink-0 flex items-center gap-x-1">
                <ActionIconButton
                    icon={<ArrowRight className="size-3" />}
                    label={forwardName}
                    disabled={!canRun || !uid}
                    ariaLabel={forwardName || "Sync source into destination"}
                    tooltip={(
                        <ActionTooltipBody
                            direction={<span className="inline-flex items-center gap-x-1">Source <ArrowRight className="size-3" /> Destination</span>}
                            from={item.sourceFolder}
                            to={item.destFolder}
                        />
                    )}
                    onClick={() => runLiveSync(uid, "forward")}
                />
                <ActionIconButton
                    icon={<ArrowLeft className="size-3" />}
                    label={reverseName}
                    disabled={!canRun || !uid}
                    ariaLabel={reverseName || "Sync destination into source"}
                    tooltip={(
                        <ActionTooltipBody
                            direction={<span className="inline-flex items-center gap-x-1">Source <ArrowLeft className="size-3" /> Destination</span>}
                            from={item.destFolder}
                            to={item.sourceFolder}
                        />
                    )}
                    onClick={() => runLiveSync(uid, "reverse")}
                />
                <ActionIconButton
                    icon={<Check className="size-3" />}
                    disabled={!canRun || !uid}
                    ariaLabel="Check folders"
                    tooltip={(
                        <ActionTooltipBody
                            direction="Compare folders"
                            from={item.sourceFolder}
                            to={item.destFolder}
                        />
                    )}
                    onClick={() => runLiveCheck(uid)}
                />
                <ActionIconButton
                    icon={<ListTree className="size-3" />}
                    disabled={!canRun || !uid}
                    ariaLabel="Check Details"
                    tooltip={(
                        <ActionTooltipBody
                            direction="Compare folders (detailed)"
                            from={item.sourceFolder}
                            to={item.destFolder}
                        />
                    )}
                    onClick={() => runLiveCheckDetails(uid)}
                />
            </div>
        </TooltipProvider>
    );
}

function ActionIconButton({ icon, label, disabled, ariaLabel, tooltip, onClick }: { icon: ReactNode; label?: string; disabled: boolean; ariaLabel: string; tooltip: ReactNode; onClick: () => void; }) {
    const named = !!label;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {/* Span keeps hover/focus when the button is disabled (pointer-events: none). */}
                <span className="min-w-0 inline-flex">
                    <Button
                        className={named ? actionNamedButtonClass : actionIconButtonClass}
                        variant="secondary"
                        size={named ? "xs" : "icon-xs"}
                        type="button"
                        disabled={disabled}
                        aria-label={ariaLabel}
                        onClick={onClick}
                    >
                        {named ? <span className="truncate">{label}</span> : icon}
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-80">
                {tooltip}
            </TooltipContent>
        </Tooltip>
    );
}

const actionButtonBaseClass = "font-normal text-sky-800 bg-sky-200 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80 border-sky-500/70";
const actionIconButtonClass = `${actionButtonBaseClass} size-4.5 p-0`;
const actionNamedButtonClass = `${actionButtonBaseClass} h-4.5 max-w-36 px-1.5 text-[0.65rem]`;

function ActionTooltipBody({ direction, from, to }: { direction: ReactNode; from: string; to: string; }) {
    return (
        <div className="text-xs grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">
            <span className="font-semibold whitespace-nowrap">Direction</span>
            {direction}
            <span className="font-semibold whitespace-nowrap">Source</span>
            <span className="break-all">{from.trim() || "—"}</span>
            <span className="font-semibold whitespace-nowrap">Target</span>
            <span className="break-all">{to.trim() || "—"}</span>
        </div>
    );
}

function runLiveSync(uid: string | undefined, direction: "forward" | "reverse") {
    if (!uid) {
        return;
    }
    const loc = findByUid(syncEditorStore.config, uid);
    if (loc?.kind === "item") {
        runSyncItem(loc.item, direction);
    }
}

function runLiveCheck(uid: string | undefined) {
    if (!uid) {
        return;
    }
    const loc = findByUid(syncEditorStore.config, uid);
    if (loc?.kind === "item") {
        runCheck(loc.item, "reportBrief");
    }
}

function runLiveCheckDetails(uid: string | undefined) {
    if (!uid) {
        return;
    }
    const loc = findByUid(syncEditorStore.config, uid);
    if (loc?.kind === "item") {
        runCheck(loc.item, "reportDetails");
    }
}
