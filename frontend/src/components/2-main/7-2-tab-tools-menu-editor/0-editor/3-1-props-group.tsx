import { Fragment } from "react";
import { cn } from "@/utils/classnames";
import { Folder } from "lucide-react";
import { IconTerminalHero } from "@/ui/icons/normal";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { type ToolMenuItem, isRegistryPath, nodeKind } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/9-types-menu";
import { type NodeProps, ExecuteCommandButton, Field_Comment, Field_MenuName, Field_TypeIcon, TriggerInfo } from "./3-4-props-shared-ui";

export function PropsFor_Submenu({ node, isRoot }: NodeProps & { isRoot?: boolean; }) {
    return (<>
        <Field_TypeIcon node={node} />

        <Field_MenuName node={node} isSubmenu />

        <Field_Comment node={node} />

        {isRoot && (
            <p className="text-muted-foreground">
                This is the root of the Tools menu. New items are added inside it. It cannot be moved or deleted.
            </p>
        )}

        <SubmenuChildrenList node={node} />
    </>);
}

function SubmenuChildrenList({ node }: NodeProps) {
    const children = node.menuItems ?? [];
    if (children.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1">
            {children.map((child) => (
                <SubmenuChildRow key={child.uid ?? child.menuName} node={child} />
            ))}
        </div>
    );
}

function SubmenuChildRow({ node }: NodeProps) {
    const kind = nodeKind(node);

    if (kind === "separator") {
        return (
            <div className="w-full min-h-3 flex items-center">
                <span className="w-full border-t border-foreground/40" />
            </div>
        );
    }

    if (kind === "submenu") {
        return (
            <div className="pr-1 min-h-7 flex items-center gap-1.5">
                <ChildTypeIcon node={node} />
                <span className="text-sm truncate">
                    {node.menuName || <span className="text-muted-foreground italic">(unnamed)</span>}
                </span>
            </div>
        );
    }

    return (
        <div className="pr-1 min-h-7 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
                <ChildTypeIcon node={node} />
                <span className="text-sm truncate">
                    {node.menuName || <span className="text-muted-foreground italic">(unnamed)</span>}
                </span>
                <NodePropertiesInfo node={node} />
            </div>

            <ExecuteCommandButton node={node} />
        </div>
    );
}

function ChildTypeIcon({ node }: NodeProps) {
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

function NodePropertiesInfo({ node }: NodeProps) {
    const rows = nodePropertyRows(node);
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
                        {rows.map((row) => (
                            <Fragment key={row.label}>
                                <span className="font-semibold whitespace-nowrap">{row.label}</span>
                                <span className="break-all">{row.value}</span>
                            </Fragment>
                        ))}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/** Filled-in properties only; Type/Name are shown in the row UI instead. */
function nodePropertyRows(node: ToolMenuItem): { label: string; value: string; }[] {
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
        add(
            "Platform",
            node.cmdPlat === "32" ? "32-bit"
                : node.cmdPlat === "64" ? "64-bit"
                    : node.cmdPlat === "both" ? "Both"
                        : undefined,
        );
    } else {
        add("Command / path / URL", node.cmdLine);
        add("Arguments", node.cmdArgs);
        if (node.cmdWhat === "rel" || node.cmdWhat === "abs") {
            add("Path type", node.cmdWhat === "rel" ? "Relative" : "Absolute");
        }
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
