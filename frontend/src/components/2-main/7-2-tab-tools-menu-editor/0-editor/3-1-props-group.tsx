import { Fragment } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { type ToolMenuItem, isRegistryPath, nodeKind } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/9-types-menu";
import {
    type NodeProps,
    ExecuteCommandButton,
    Field_Comment,
    Field_MenuName,
    Field_TypeIcon,
    TriggerInfo,
} from "./3-4-props-shared-ui";

export function PropsFor_Separator({ node }: NodeProps) {
    return (<>
        <Field_TypeIcon node={node} />

        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the menu.
        </p>

        <Field_Comment node={node} />
    </>);
}

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
    const isItem = kind === "item";
    const isSeparator = kind === "separator";

    if (isSeparator) {
        return (
            <div className="pr-1 h-7 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-1">
                    <span className="w-24 max-w-40 border-t border-foreground/40" />
                    <NodePropertiesInfo node={node} />
                </div>
            </div>
        );
    }

    return (
        <div className="pr-1 min-h-7 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1">
                <span className="text-sm truncate">
                    {node.menuName || <span className="text-muted-foreground italic">(unnamed)</span>}
                </span>
                <NodePropertiesInfo node={node} />
            </div>

            {isItem && (
                <ExecuteCommandButton node={node} />
            )}
        </div>
    );
}

function NodePropertiesInfo({ node }: NodeProps) {
    const rows = nodePropertyRows(node);

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

function nodePropertyRows(node: ToolMenuItem): { label: string; value: string; }[] {
    const kind = nodeKind(node);
    const rows: { label: string; value: string; }[] = [];

    function add(label: string, value: string | undefined | null) {
        const trimmed = value?.trim();
        if (trimmed) {
            rows.push({ label, value: trimmed });
        }
    }

    if (kind === "separator") {
        add("Type", "Separator");
        add("Comment", node.comment);
        return rows;
    }

    if (kind === "submenu") {
        add("Type", "Menu");
        add("Name", node.menuName || "(unnamed)");
        if ((node.menuItems?.length ?? 0) > 0) {
            add("Items", String(node.menuItems!.length));
        }
        add("Comment", node.comment);
        return rows;
    }

    const isRegistry = isRegistryPath(node);
    add("Type", isRegistry ? "Registry Path" : "Command");
    add("Name", node.menuName || "(unnamed)");

    if (isRegistry) {
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
