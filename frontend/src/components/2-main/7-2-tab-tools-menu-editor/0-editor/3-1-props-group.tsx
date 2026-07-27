import { Fragment } from "react";
import { cn } from "@/utils/classnames";
import { Folder } from "lucide-react";
import { IconTerminalHero } from "@/ui/icons/normal";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { ToolsConfig_ExecuteByUid } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { type ToolMenuItem, isRegistryPath, nodeKind } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/9-types-menu";
import { type NodeProps, Field_Comment, Field_MenuName, Field_TypeIcon, TriggerInfo } from "./3-4-props-shared-ui";

export function PropsFor_Submenu({ node, isRoot }: NodeProps & { isRoot?: boolean; }) {
    return (<>
        {!isRoot && (<>
            <Field_TypeIcon node={node} />
            <Field_MenuName node={node} isSubmenu />
        </>)}

        <Field_Comment node={node} />

        <QuickAccessList node={node} />

        {/* {isRoot && (
            <p className="text-muted-foreground">
                This is the root of the Tools menu. New items are added inside it. It cannot be moved or deleted.
            </p>
        )} */}
    </>);
}

function QuickAccessList({ node }: NodeProps) {
    const children = node.menuItems ?? [];
    if (children.length === 0) {
        return null;
    }

    return (
        <div className="p-2 border rounded flex flex-col gap-1.5">
            <div className="text-[0.65rem] text-muted-foreground select-none">
                Quick actions list
            </div>
            <QuickAccessItems node={node} depth={0} />
        </div>
    );
}

function QuickAccessItems({ node, depth }: NodeProps & { depth: number; }) {
    const children = node.menuItems ?? [];
    if (children.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1">
            {children.map(
                (child) => (
                    <QuickAccessItem key={child.uid ?? child.menuName} node={child} depth={depth} />
                )
            )}
        </div>
    );
}

function QuickAccessItem({ node, depth }: NodeProps & { depth: number; }) {
    const kind = nodeKind(node);
    const indentStyle = { paddingLeft: depth * CHILD_INDENT };

    if (kind === "separator") {
        return (
            <div className="w-full min-h-3 flex items-center" style={indentStyle}>
                <span className="w-full border-t border-foreground/40" />
            </div>
        );
    }

    if (kind === "submenu") {
        return (
            <div className="flex flex-col gap-1">
                <div className="pr-1 flex items-center gap-x-1.5" style={indentStyle}>
                    <QuickAccessItemTypeIcon node={node} />
                    <span className="text-[0.65rem] truncate">
                        {node.menuName || <span className="text-muted-foreground italic">(unnamed)</span>}
                    </span>
                </div>
                <QuickAccessItems node={node} depth={depth + 1} />
            </div>
        );
    }

    return (
        <div
            className="pr-1 flex items-center justify-between gap-0.5 has-[button:hover]:**:data-qa-name:text-blue-600 dark:has-[button:hover]:**:data-qa-name:text-blue-400"
            style={indentStyle}
        >
            <div className="min-w-0 flex items-center gap-x-1.5">
                <QuickAccessItemTypeIcon node={node} />

                <span data-qa-name className="text-[0.75rem] truncate transition-colors">
                    {node.menuName || <span className="text-muted-foreground italic">(unnamed)</span>}
                </span>
                <QuickAccessItemPropertiesInfo node={node} />
            </div>
            <QuickAccessExecuteButton node={node} />
        </div>
    );
}

const CHILD_INDENT = 16;

function QuickAccessExecuteButton({ node }: NodeProps) {
    const canExecute = !!(node.cmdLine?.trim());
    const uid = node.uid;

    return (
        <Button
            className="h-5 px-1.5 text-[0.65rem] font-normal text-sky-800 bg-sky-200 border-sky-500/60 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80"
            variant="secondary"
            size="xs"
            type="button"
            disabled={!canExecute || !uid}
            title={canExecute
                ? "Run this command as if selected from the Tools menu"
                : "Set a command / path / URL first"}
            onClick={() => uid && void ToolsConfig_ExecuteByUid(uid)}
        >
            Execute
        </Button>
    );
}
function QuickAccessItemTypeIcon({ node }: NodeProps) {
    const kind = nodeKind(node);
    const isRegistry = kind === "item" && isRegistryPath(node);
    const iconClass = cn(
        "shrink-0 size-3.5",
        kind === "submenu"
            ? "text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900"
            : isRegistry
                ? "opacity-70"
                : "text-foreground/70 fill-foreground/10!",
    );

    if (kind === "submenu") {
        return <Folder className={iconClass} />;
    }
    if (isRegistry) {
        return <SymbolAppRegedit className={iconClass} />;
    }
    return <IconTerminalHero className={iconClass} />;
}

function QuickAccessItemPropertiesInfo({ node }: NodeProps) {
    const rows = quickAccessItemPropertyRows(node);
    if (rows.length === 0) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <TriggerInfo aria-label="Item properties" />
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

/** Filled-in properties only; Type/Name are shown in the row UI instead. */
function quickAccessItemPropertyRows(node: ToolMenuItem): { label: string; value: string; }[] {
    const kind = nodeKind(node);
    const rows: { label: string; value: string; }[] = [];

    function add(label: string, value: string | undefined | null) {
        const trimmed = value?.trim();
        if (trimmed) {
            rows.push({ label, value: trimmed });
        }
    }

    if (kind !== "item") {
        return rows;
    }

    if (isRegistryPath(node)) {
        add("Registry key", node.cmdLine);
        add("Platform", node.cmdPlat === "32" ? "32-bit" : node.cmdPlat === "64" ? "64-bit" : node.cmdPlat === "both" ? "Both" : undefined);
    } else {
        add("Command / path / URL", node.cmdLine);
        add("Arguments", node.cmdArgs);
        if (node.cmdWhat === "rel" || node.cmdWhat === "abs") { add("Path type", node.cmdWhat === "rel" ? "Relative" : "Absolute"); }
    }

    if (node.runElevated !== undefined) {
        add("Run elevated", node.runElevated ? "Yes" : "No");
    }

    add("Hotkey", node.hotKey);
    if (node.hotKey?.trim()) {
        add("Hotkey scope", node.hotKeyGlobal ? "Global" : "Local");
    }

    add("Comment", node.comment);

    return rows;
}
