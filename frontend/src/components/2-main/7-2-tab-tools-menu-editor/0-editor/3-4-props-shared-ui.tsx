import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { classNames, cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { AnimatePresence, motion } from "motion/react";
import { IconTerminalHero } from "@/ui/icons/normal";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { ChevronRight, Folder, Info } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Textarea } from "@/ui/shadcn/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { HotkeyInput, formatHotkey, parseHotkey, type HotkeyChord } from "@/ui/local-ui/9-hotkey";
import { ToolsConfig_ExecuteByUid } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { patchSelectedNode } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/use-selected-node";
import { type ToolMenuItem, isRegistryPath, nodeKind } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/9-types-menu";

export type NodeProps = { node: ToolMenuItem; };

export function Field_MenuName({ node, isSubmenu }: NodeProps & { isSubmenu?: boolean; }) {
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

export function Field_HotKey({ node }: NodeProps) {
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
        <LabelAndField className="w-36" label="Hotkey">
            <HotkeyInput
                value={chord}
                onChange={setChord}
                isGlobal={isGlobal}
                onIsGlobalChange={setGlobal}
                tabIndex={-1}
            />
        </LabelAndField>
    );
}

export function Field_Comment({ node }: NodeProps) {
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
export function CollapsibleOptionalField({ label, value, children }: { label: string; value: string; children: ReactNode; }) {
    const hasValue = !!value.trim();
    const [open, setOpen] = useState(hasValue);

    useEffect(() => {
        setOpen(hasValue);
    }, [hasValue]);

    return (
        <div className="-mt-1 flex flex-col gap-0.5">
            <Label className={classNames(labelClasses, "select-none inline-flex items-center gap-px cursor-pointer")} onClick={() => setOpen((v) => !v)}>
                {label}
                <motion.span
                    className="shrink-0 relative w-3 h-4 text-muted-foreground flex items-center justify-center"
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: 0.1, ease: "easeInOut" }}
                >
                    <ChevronRight className="size-2.5" />
                </motion.span>
            </Label>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
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

export const labelClasses = "text-[0.65rem] font-normal text-foreground/70 select-none";

export function LabelAndField({ label, labelHint, children, ...props }: { label: string; labelHint?: ReactNode; } & ComponentProps<"div">) {
    return (
        <div className="flex flex-col gap-0.5" {...props}>
            <div className="inline-flex items-center gap-0.5">
                <Label className={labelClasses}>{label}</Label>
                {labelHint}
            </div>
            {children}
        </div>
    );
}

/** Info-icon trigger with tooltip content; pass `label` for accessibility. */
export function InfoTooltip({ label, children, side, contentClasses }: { label: string; children: ReactNode; side?: ComponentProps<typeof TooltipContent>["side"]; contentClasses?: string; }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <InfoTooltipTrigger aria-label={label} />
                </TooltipTrigger>

                <TooltipContent side={side} className={contentClasses}>
                    {children}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function InfoTooltipTrigger({ className, ...rest }: ComponentProps<"button">) {
    return (
        <button className={cn("ml-px text-muted-foreground/70 hover:text-muted-foreground inline-flex items-center", className)} type="button" {...rest}>
            <Info className="size-2.5" />
        </button>
    );
}

export function Field_TypeIcon({ node }: { node: ToolMenuItem; }) {
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
        <div className={classNames(labelClasses, "px-2 py-1 w-fit bg-muted border rounded inline-flex items-center gap-1")}>
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

export function ExecuteCommandButton({ node }: NodeProps) {
    const canExecute = !!(node.cmdLine?.trim());
    const uid = node.uid;

    return (
        <Button
            className="font-normal text-sky-800 bg-sky-200 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80 border-sky-500/60 rounded"
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
