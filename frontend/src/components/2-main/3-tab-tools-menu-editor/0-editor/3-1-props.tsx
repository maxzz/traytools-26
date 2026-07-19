import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { ChevronRight, Folder, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { IconTerminalHero } from "@/ui/icons/normal";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { Textarea } from "@/ui/shadcn/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { HotkeyInput, formatHotkey, parseHotkey, type HotkeyChord } from "@/ui/local-ui/9-hotkey";
import { patchSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { type CmdPlat, type CmdWhat, type ToolMenuItem, effectiveRunElevated, isRegistryPath, nodeKind } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/9-types-menu";

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
    </>);
}

export function PropsFor_Item({ node }: NodeProps) {
    return (<>
        <Field_TypeIcon node={node} />

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

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <Field_Cmd_Reg_Path node={node} />
            <Field_Cmd_PathAbsOrRelative node={node} />
            <Field_Cmd_RunElevated node={node} />
        </div>
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
            <Field_Cmd_Reg_Path node={node} />
            <Field_Reg_Platform node={node} />
        </div>
    </>);
}

// --------------------------------------------------------------------------
// Fields

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

function Field_Cmd_PathAbsOrRelative({ node }: NodeProps) {
    return (
        <LabelAndField
            label="Path type"
            labelHint={(
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <TriggerInfo aria-label="Path type help" />
                        </TooltipTrigger>

                        <TooltipContent side="top" className="max-w-64">
                            <div className="text-xs flex flex-col gap-1.5">
                                <p><strong>Relative</strong> — path relative to the folder containing tools.json.</p>
                                <p><strong>Absolute</strong> — full path or program name, used as-is after env-var expansion.</p>
                                <p><strong>URL</strong> — web link; use Absolute with a scheme:// address (e.g. https://…).</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        >
            <Select value={node.cmdWhat ?? "rel"} onValueChange={(v) => patchSelectedNode((n) => { n.cmdWhat = v as CmdWhat; })}>
                <SelectTrigger className="px-2 w-full h-7! text-[0.72rem]">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem className="text-[0.72rem]" value="abs">Absolute</SelectItem>
                    <SelectItem className="text-[0.72rem]" value="rel">Relative</SelectItem>
                </SelectContent>
            </Select>
        </LabelAndField>
    );
}

function Field_Cmd_RunElevated({ node }: NodeProps) {
    return (
        <LabelAndField
            label="Elevated"
            labelHint={(
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <TriggerInfo aria-label="Run elevated help" />
                        </TooltipTrigger>

                        <TooltipContent side="top" className="max-w-64">
                            <p className="text-xs">Launch this command with administrator privileges.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        >
            <div className="px-2 h-7 bg-transparent border border-input rounded-sm flex items-center">
                <Switch
                    className="mx-auto scale-70"
                    checked={effectiveRunElevated(node)}
                    onCheckedChange={(checked) => patchSelectedNode((n) => { n.runElevated = checked; })}
                />
            </div>
        </LabelAndField>
    );
}

function Field_Cmd_Reg_Path({ node }: NodeProps) {
    return (
        <LabelAndField label={node.cmdWhat === "reg" ? "Registry key" : "Command / path / URL"}>
            <Input
                className="h-7"
                value={node.cmdLine ?? ""}
                placeholder={node.cmdWhat === "reg" ? "HKLM\\SOFTWARE\\..." : "notepad.exe or https://..."}
                onChange={(e) => patchSelectedNode((n) => { n.cmdLine = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

function Field_Cmd_CliArgs({ node }: NodeProps) {
    return (
        <LabelAndField label="Arguments">
            <Input
                className="h-7"
                value={node.cmdArgs ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v) { n.cmdArgs = v; } else { delete n.cmdArgs; }
                })}
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
    const hasComment = !!(node.comment?.trim());
    const [open, setOpen] = useState(hasComment);

    useEffect(() => {
        setOpen(hasComment);
    }, [hasComment]);

    return (
        <div className="-mt-1 flex flex-col gap-0.5">
            <Label
                className="pl-1 text-[0.65rem] select-none inline-flex items-center gap-px cursor-pointer"
                onClick={() => setOpen((v) => !v)}
            >
                Comment
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
                        <Textarea
                            className="px-3 py-2 min-h-6 rounded-sm resize-none"
                            value={node.comment ?? ""}
                            onChange={(e) => patchSelectedNode((n) => {
                                const v = e.target.value;
                                if (v.trim()) { n.comment = v; } else { delete n.comment; }
                            })}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function LabelAndField({ label, labelHint, children, ...props }: { label: string; labelHint?: ReactNode; } & ComponentProps<"div">) {
    return (
        <div className="flex flex-col gap-0.5" {...props}>
            <div className="inline-flex items-center gap-0.5">
                <Label className="pl-1 text-[0.65rem]">{label}</Label>
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
