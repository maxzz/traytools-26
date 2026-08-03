import { type ComponentProps, type ReactNode } from "react";
import { classNames, cn } from "@/utils/classnames";
import { FileIcon, Folder, Info } from "lucide-react";
import { IconTerminalHero } from "@/ui/icons/normal";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";

export const labelClasses = "text-[0.65rem] font-normal text-foreground/70 select-none";

/** Preset icons for tree-editor type badges. */
export const typeBadgeIcons = {
    folder: <Folder className="shrink-0 size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />,
    file: <FileIcon className="shrink-0 size-3.5 text-foreground/70" />,
    registry: <SymbolAppRegedit className="shrink-0 size-3.5 opacity-70" />,
    command: <IconTerminalHero className="shrink-0 size-3.5 text-foreground/70 fill-foreground/10!" />,
} as const;

export function LabelAndField({ label, labelHint, children, ...props }: { label: string; labelHint?: ReactNode; } & ComponentProps<"div">) {
    return (
        <div className="flex flex-col gap-0.5" {...props}>
            <div className="inline-flex items-center gap-0.5">
                <Label className={labelClasses}>{label}</Label>
                {typeof labelHint === "string"
                    ? <InfoTooltip label={`${label} help`}>{labelHint}</InfoTooltip>
                    : labelHint
                }
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
        <button className={cn("ml-px text-muted-foreground/70 hover:text-muted-foreground inline-flex items-center", className)} type="button" tabIndex={-1} {...rest}>
            <Info className="size-2.5" />
        </button>
    );
}

/**
 * title: Native HTML title tooltip on the label.
 * titleRich: Info-icon trigger for a shadcn tooltip (string or rich content).
 */
export function FlagSwitch({ label, title, titleRich, checked, disabled, onCheckedChange }: {
    label: string; 
    title?: string; 
    titleRich?: ReactNode; 
    checked: boolean; 
    disabled?: boolean; 
    onCheckedChange: (v: boolean) => void;
}) {
    return (
        <div className="inline-flex items-center gap-0.5">
            <Label
                className={classNames(
                    labelClasses,
                    "flex items-center gap-1",
                    disabled ? "opacity-70 cursor-default" : "cursor-pointer",
                )}
                title={title}
            >
                <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onCheckedChange(v === true)} />
                <span className="mt-0.5">{label}</span>
            </Label>

            {titleRich != null && titleRich !== "" && (
                <InfoTooltip label={`${label} help`}>
                    {typeof titleRich === "string" ? <p className="text-xs">{titleRich}</p> : titleRich}
                </InfoTooltip>
            )}
        </div>
    );
}

/** Compact "Group" / "Command" / etc. badge shown at the top of a props pane. */
export function Field_TypeIcon({ label, icon }: { label: string; icon?: ReactNode; }) {
    return (
        <div className={classNames(labelClasses, "px-2 py-1 w-fit bg-muted border rounded inline-flex items-center gap-1")}>
            {icon}
            {label}
        </div>
    );
}

/** Sky secondary action button used across editor props toolbars. */
export function PropsActionButton({ label, disabled, title, onClick }: { label: string; disabled?: boolean; title?: string; onClick: () => void; }) {
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
