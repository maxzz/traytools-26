import { type ComponentProps, type ReactNode, Fragment, useEffect, useState } from "react";
import { cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { AnimatePresence, motion } from "motion/react";
import { IconTerminalHero } from "@/ui/icons/normal";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { ChevronRight, Folder, Info } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Textarea } from "@/ui/shadcn/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { HotkeyInput, formatHotkey, parseHotkey, type HotkeyChord } from "@/ui/local-ui/9-hotkey";
import { PathInput } from "@/components/2-main/a-shared/path-input";
import { ToolsConfig_ExecuteByUid } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { patchSelectedNode } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/use-selected-node";
import { type CmdPlat, type ToolMenuItem, effectiveRunElevated, isRegistryPath, nodeKind } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/9-types-menu";

type NodeProps = { node: ToolMenuItem; };

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

export function PropsFor_Item({ node }: NodeProps) {
    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon node={node} />
            <ExecuteCommandButton node={node} />
        </div>

        {isRegistryPath(node)
            ? <PropsAs_RegistryItem node={node} />
            : <PropsAs_CommandItem node={node} />
        }
    </>);
}

function PropsAs_CommandItem({ node }: NodeProps) {
    return (<>
        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_MenuName node={node} />
            <Field_HotKey node={node} />
        </div>
        <Field_Comment node={node} />

        <Field_Cmd_Path node={node} />
        <CommandPathFlags node={node} />
        <Field_Cmd_CliArgs node={node} />
    </>);
}

function PropsAs_RegistryItem({ node }: NodeProps) {
    return (<>
        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_MenuName node={node} />
            <Field_HotKey node={node} />
        </div>
        <Field_Comment node={node} />

        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_Reg_Path node={node} />
            <Field_Reg_Platform node={node} />
        </div>
    </>);
}

// --------------------------------------------------------------------------
// Command fields

function Field_Cmd_Path({ node }: NodeProps) {
    return (
        <LabelAndField label="Command / path / URL">
            <PathInput
                value={node.cmdLine ?? ""}
                onChange={(path) => patchSelectedNode((n) => { n.cmdLine = path; })}
                kind="file"
                showReveal
            />
        </LabelAndField>
    );
}

function CommandPathFlags({ node }: NodeProps) {
    const isRelative = (node.cmdWhat ?? "rel") === "rel";

    return (
        <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <FlagSwitch
                label="Relative path"
                hint={(
                    <div className="text-xs grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">
                        <span className="font-semibold">Relative</span>
                        <span>Path relative to the folder containing tools.json.</span>
                        <span className="font-semibold">Absolute</span>
                        <span>Full path or program name, used as-is after env-var expansion.</span>
                        <span className="font-semibold">URL</span>
                        <span>Web link; use Absolute with a scheme:// address (e.g. https://…).</span>
                    </div>
                )}
                checked={isRelative}
                onCheckedChange={(v) => patchSelectedNode((n) => { n.cmdWhat = v ? "rel" : "abs"; })}
            />

            <FlagSwitch
                label="Run elevated"
                hint={<p className="text-xs">Launch this command with administrator privileges.</p>}
                checked={effectiveRunElevated(node)}
                onCheckedChange={(v) => patchSelectedNode((n) => { n.runElevated = v; })}
            />
        </div>
    );
}

function FlagSwitch({ label, hint, checked, onCheckedChange, }: { label: string; hint: ReactNode; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    return (
        <div className="inline-flex items-center gap-0.5">
            <Label className="text-[0.65rem] text-muted-foreground font-normal cursor-pointer flex items-center gap-1">
                <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
                <span className="mt-0.5">{label}</span>
            </Label>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <TriggerInfo aria-label={`${label} help`} />
                    </TooltipTrigger>

                    <TooltipContent side="top" className="max-w-64">
                        {hint}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}

function Field_Cmd_CliArgs({ node }: NodeProps) {
    return (
        <CollapsibleOptionalField label="Arguments" value={node.cmdArgs ?? ""}>
            <Input
                className="h-7"
                value={node.cmdArgs ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v.trim()) { n.cmdArgs = v; } else { delete n.cmdArgs; }
                })}
                {...turnOffAutoComplete}
            />
        </CollapsibleOptionalField>
    );
}

// --------------------------------------------------------------------------
// Registry fields

function Field_Reg_Path({ node }: NodeProps) {
    return (
        <LabelAndField label="Registry key">
            <Input
                className="h-7"
                value={node.cmdLine ?? ""}
                placeholder="HKLM\\SOFTWARE\\..."
                onChange={(e) => patchSelectedNode((n) => { n.cmdLine = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

function Field_Reg_Platform({ node }: NodeProps) {
    return (
        <LabelAndField
            label="Platform"
            labelHint={(
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <TriggerInfo aria-label="Platform help" />
                        </TooltipTrigger>

                        <TooltipContent side="top" className="max-w-64">
                            <div className="text-xs flex flex-col gap-1.5">
                                <p><strong>Current</strong> — use the default registry view for this OS.</p>
                                <p><strong>32-bit</strong> — prefer the 32-bit (WOW6432Node) registry view.</p>
                                <p><strong>64-bit</strong> — prefer the 64-bit registry view.</p>
                                <p><strong>Both</strong> — for keys that may exist in either view.</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        >
            <Select value={node.cmdPlat ?? "curr"} onValueChange={(v) => patchSelectedNode((n) => { if (v === "curr") { delete n.cmdPlat; } else { n.cmdPlat = v as CmdPlat; } })}>
                <SelectTrigger className="w-full h-7! min-w-20 text-[0.72rem]">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="curr">Current</SelectItem>
                    <SelectItem value="32">32-bit</SelectItem>
                    <SelectItem value="64">64-bit</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                </SelectContent>
            </Select>
        </LabelAndField>
    );
}

// --------------------------------------------------------------------------
// Common fields

function Field_MenuName({ node, isSubmenu }: NodeProps & { isSubmenu?: boolean; }) {
    return (
        <LabelAndField label={isSubmenu ? "Submenu name" : "Menu label"}>
            <Input
                className="h-7"
                value={node.menuName}
                onChange={(e) => patchSelectedNode((n) => { n.menuName = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

function Field_HotKey({ node }: NodeProps) {
    const chord = parseHotkey(node.hotKey);
    const isGlobal = !!node.hotKeyGlobal;

    function setChord(next: HotkeyChord | null) {
        patchSelectedNode((n) => {
            const text = formatHotkey(next);
            if (text) {
                n.hotKey = text;
            } else {
                delete n.hotKey;
                delete n.hotKeyGlobal;
            }
        });
    }

    function setGlobal(global: boolean) {
        patchSelectedNode((n) => {
            if (global && n.hotKey) {
                n.hotKeyGlobal = true;
            } else {
                delete n.hotKeyGlobal;
            }
        });
    }

    return (
        <LabelAndField className="w-44" label="Hotkey">
            <HotkeyInput
                value={chord}
                onChange={setChord}
                isGlobal={isGlobal}
                onIsGlobalChange={setGlobal}
            />
        </LabelAndField>
    );
}

function Field_Comment({ node }: NodeProps) {
    return (
        <CollapsibleOptionalField label="Comment" value={node.comment ?? ""}>
            <Textarea
                className="px-3 resize-none"
                value={node.comment ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v.trim()) { n.comment = v; } else { delete n.comment; }
                })}
            />
        </CollapsibleOptionalField>
    );
}

/** Collapses when `value` is empty; click the label to expand/collapse. */
function CollapsibleOptionalField({ label, value, children }: { label: string; value: string; children: ReactNode; }) {
    const hasValue = !!value.trim();
    const [open, setOpen] = useState(hasValue);

    useEffect(() => {
        setOpen(hasValue);
    }, [hasValue]);

    return (
        <div className="-mt-1 flex flex-col gap-0.5">
            <Label
                className="text-[0.65rem] text-muted-foreground select-none inline-flex items-center gap-px cursor-pointer"
                onClick={() => setOpen((v) => !v)}
            >
                {label}
                <motion.span
                    animate={{ rotate: open ? 90 : 0 }}
                    className="shrink-0 relative w-3 h-4 text-muted-foreground flex items-center justify-center"
                    transition={{ duration: 0.1, ease: "easeInOut" }}
                >
                    <ChevronRight className="size-2.5" />
                </motion.span>
            </Label>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        className="overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

{/* <div className="flex flex-col gap-1">
<span className="text-xs text-muted-foreground">{label}</span> */}


function LabelAndField({ label, labelHint, children, ...props }: { label: string; labelHint?: ReactNode; } & ComponentProps<"div">) {
    return (
        <div className="flex flex-col gap-0.5" {...props}>
            <div className="inline-flex items-center gap-0.5">
                <Label className="text-[0.65rem] text-muted-foreground">{label}</Label>
                {labelHint}
            </div>
            {children}
        </div>
    );
}

function TriggerInfo({ className, ...rest }: ComponentProps<"button">) {
    return (
        <button className={cn("ml-0.5 text-muted-foreground/70 hover:text-muted-foreground inline-flex items-center", className)} type = "button" {...rest}>
            <Info className="size-2.5" />
        </button>
    );
}

function Field_TypeIcon({ node }: { node: ToolMenuItem; }) {
    const kind = nodeKind(node);
    const isRegistry = kind === "item" && isRegistryPath(node);
    const label =
        kind === "submenu"
            ? "Menu"
            : kind === "separator"
                ? "Separator"
                : isRegistry
                    ? "Registry Path"
                    : kind === "item"
                        ? "Command"
                        : "Properties";
    const iconClass = cn(
        "shrink-0 size-3.5",
        kind === "submenu"
            ? "text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900"
            : isRegistry
                ? "opacity-70"
                : "text-foreground/70 fill-foreground/10!",
    );
    return (
        <div className={"px-2 py-1 w-fit text-[0.65rem] text-muted-foreground bg-muted border rounded inline-flex items-center gap-1"}>
            {kind !== "separator" && (
                kind === "submenu"
                    ? <Folder className={iconClass} />
                    : isRegistry
                        ? <SymbolAppRegedit className={iconClass} />
                        : <IconTerminalHero className={iconClass} />
            )}
            {label}
        </div>
    );
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

function ExecuteCommandButton({ node }: NodeProps) {
    const canExecute = !!(node.cmdLine?.trim());
    const uid = node.uid;

    return (
        <Button
            className="font-normal text-sky-800 dark:text-sky-400 bg-sky-200 dark:bg-sky-800/40 border-sky-500/60 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80"
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
