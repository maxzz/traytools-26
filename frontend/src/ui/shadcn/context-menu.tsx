import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { ChevronRightIcon, CheckIcon } from "lucide-react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";

export function ContextMenu({ ...rest }: ComponentProps<typeof ContextMenuPrimitive.Root>) {
    return <ContextMenuPrimitive.Root data-slot="context-menu" {...rest} />;
}

export function ContextMenuTrigger({ className, ...rest }: ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
    return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" className={cn("select-none", className)} {...rest} />;
}

export function ContextMenuGroup({ ...rest }: ComponentProps<typeof ContextMenuPrimitive.Group>) {
    return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...rest} />;
}

export function ContextMenuPortal({ ...rest }: ComponentProps<typeof ContextMenuPrimitive.Portal>) {
    return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...rest} />;
}

export function ContextMenuSub({ ...rest }: ComponentProps<typeof ContextMenuPrimitive.Sub>) {
    return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...rest} />;
}

export function ContextMenuRadioGroup({ ...rest }: ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
    return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...rest} />;
}

export function ContextMenuContent({ className, ...rest }: ComponentProps<typeof ContextMenuPrimitive.Content> & { side?: "top" | "right" | "bottom" | "left"; }) {
    return (
        <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Content
                data-slot="context-menu-content"
                className={cn(contentClasses, className)}
                {...rest}
            />
        </ContextMenuPrimitive.Portal>
    );
}

const contentClasses = "\
p-1 min-w-36 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) \
\
text-popover-foreground \
bg-popover \
duration-100 \
\
data-[side=bottom]:slide-in-from-top-2 \
data-[side=left]:slide-in-from-right-2 \
data-[side=right]:slide-in-from-left-2 \
data-[side=top]:slide-in-from-bottom-2 \
\
data-open:animate-in \
data-open:fade-in-0 \
data-open:zoom-in-95 \
\
data-closed:animate-out \
data-closed:fade-out-0 \
data-closed:zoom-out-95 \
\
ring-1 \
ring-foreground/10 \
rounded-lg \
shadow-md \
overflow-x-hidden \
overflow-y-auto \
z-50";

export function ContextMenuItem({ className, inset, variant = "default", ...rest }: ComponentProps<typeof ContextMenuPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive"; }) {
    return (
        <ContextMenuPrimitive.Item
            data-slot="context-menu-item"
            data-inset={inset}
            data-variant={variant}
            className={cn(itemClasses, className)}
            {...rest}
        />
    );
}

const itemClasses = "\
group/context-menu-item relative px-1.5 py-1 text-sm \
\
focus:text-accent-foreground \
focus:bg-accent \
\
data-inset:pl-7 \
data-[variant=destructive]:text-destructive \
data-[variant=destructive]:focus:bg-destructive/10 \
data-[variant=destructive]:focus:text-destructive \
\
dark:data-[variant=destructive]:focus:bg-destructive/20 \
data-disabled:pointer-events-none data-disabled:opacity-50 \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
focus:*:[svg]:text-accent-foreground \
\
data-[variant=destructive]:*:[svg]:text-destructive \
\
rounded-md \
outline-hidden \
cursor-default \
select-none \
flex items-center gap-1.5";

export function ContextMenuSubTrigger({ className, inset, children, ...rest }: ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean; }) {
    return (
        <ContextMenuPrimitive.SubTrigger
            data-slot="context-menu-sub-trigger"
            data-inset={inset}
            className={cn(subTriggerClasses, className)}
            {...rest}
        >
            {children}
            <ChevronRightIcon className="ml-auto" />
        </ContextMenuPrimitive.SubTrigger>
    );
}

const subTriggerClasses = "\
px-1.5 py-1 text-sm \
\
focus:text-accent-foreground \
focus:bg-accent \
\
data-inset:pl-7 \
data-open:bg-accent \
data-open:text-accent-foreground \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
rounded-md \
outline-hidden \
select-none \
cursor-default \
flex items-center gap-1.5";

export function ContextMenuSubContent({ className, ...rest }: ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
    return (
        <ContextMenuPrimitive.SubContent
            data-slot="context-menu-sub-content"
            className={cn(subContentClasses, className)}
            {...rest}
        />
    );
}

const subContentClasses = "\
p-1 min-w-32 origin-(--radix-context-menu-content-transform-origin) \
\
text-popover-foreground \
bg-popover \
duration-100 \
\
data-[side=bottom]:slide-in-from-top-2 \
data-[side=left]:slide-in-from-right-2 \
data-[side=right]:slide-in-from-left-2 \
data-[side=top]:slide-in-from-bottom-2 \
\
data-open:animate-in \
data-open:fade-in-0 \
data-open:zoom-in-95 \
\
data-closed:animate-out \
data-closed:fade-out-0 \
data-closed:zoom-out-95 \
\
border \
rounded-lg \
shadow-lg \
overflow-hidden \
z-50";

export function ContextMenuCheckboxItem({ className, children, checked, inset, ...rest }: ComponentProps<typeof ContextMenuPrimitive.CheckboxItem> & { inset?: boolean; }) {
    return (
        <ContextMenuPrimitive.CheckboxItem
            data-slot="context-menu-checkbox-item"
            data-inset={inset}
            className={cn(checkboxItemClasses, className)}
            checked={checked}
            {...rest}
        >
            <span className="absolute right-2 pointer-events-none">
                <ContextMenuPrimitive.ItemIndicator>
                    <CheckIcon />
                </ContextMenuPrimitive.ItemIndicator>
            </span>
            {children}
        </ContextMenuPrimitive.CheckboxItem>
    );
}

const checkboxItemClasses = "\
relative pr-8 pl-1.5 py-1 text-sm \
\
focus:bg-accent \
focus:text-accent-foreground \
\
data-inset:pl-7 \
data-disabled:pointer-events-none \
data-disabled:opacity-50 \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
outline-hidden \
rounded-md \
cursor-default \
select-none \
flex items-center gap-1.5";

export function ContextMenuRadioItem({ className, children, inset, ...rest }: ComponentProps<typeof ContextMenuPrimitive.RadioItem> & { inset?: boolean; }) {
    return (
        <ContextMenuPrimitive.RadioItem
            data-slot="context-menu-radio-item"
            data-inset={inset}
            className={cn(radioItemClasses, className)}
            {...rest}
        >
            <span className="absolute right-2 pointer-events-none">
                <ContextMenuPrimitive.ItemIndicator>
                    <CheckIcon />
                </ContextMenuPrimitive.ItemIndicator>
            </span>
            {children}
        </ContextMenuPrimitive.RadioItem>
    );
}

const radioItemClasses = "\
relative pr-8 pl-1.5 py-1 \
\
text-sm \
\
focus:bg-accent \
focus:text-accent-foreground \
\
data-inset:pl-7 \
data-disabled:pointer-events-none \
data-disabled:opacity-50 \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
outline-hidden \
rounded-md \
select-none \
cursor-default \
flex items-center gap-1.5";

export function ContextMenuLabel({ className, inset, ...rest }: ComponentProps<typeof ContextMenuPrimitive.Label> & { inset?: boolean; }) {
    return (
        <ContextMenuPrimitive.Label
            data-slot="context-menu-label"
            data-inset={inset}
            className={cn("px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7", className)}
            {...rest}
        />
    );
}

export function ContextMenuSeparator({ className, ...rest }: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
    return (
        <ContextMenuPrimitive.Separator
            data-slot="context-menu-separator"
            className={cn("-mx-1 my-1 h-px bg-border", className)}
            {...rest}
        />
    );
}

export function ContextMenuShortcut({ className, ...rest }: ComponentProps<"span">) {
    return (
        <span
            data-slot="context-menu-shortcut"
            className={cn("ml-auto text-xs tracking-widest text-muted-foreground group-focus/context-menu-item:text-accent-foreground", className)}
            {...rest}
        />
    );
}
