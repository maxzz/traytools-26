import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { Menubar as MenubarPrimitive } from "radix-ui";

export function Menubar({ className, ...rest }: ComponentProps<typeof MenubarPrimitive.Root>) {
    return <MenubarPrimitive.Root data-slot="menubar" className={cn("p-0.75 h-8 border rounded-lg flex items-center gap-0.5", className)} {...rest} />;
}

export function MenubarMenu({ ...rest }: ComponentProps<typeof MenubarPrimitive.Menu>) {
    return <MenubarPrimitive.Menu data-slot="menubar-menu" {...rest} />;
}

export function MenubarGroup({ ...rest }: ComponentProps<typeof MenubarPrimitive.Group>) {
    return <MenubarPrimitive.Group data-slot="menubar-group" {...rest} />;
}

export function MenubarPortal({ ...rest }: ComponentProps<typeof MenubarPrimitive.Portal>) {
    return <MenubarPrimitive.Portal data-slot="menubar-portal" {...rest} />;
}

export function MenubarRadioGroup({ ...rest }: ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
    return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...rest} />;
}

export function MenubarTrigger({ className, ...rest }: ComponentProps<typeof MenubarPrimitive.Trigger>) {
    return (
        <MenubarPrimitive.Trigger
            data-slot="menubar-trigger"
            className={cn("select-none px-1.5 py-0.5 text-xs font-medium hover:bg-muted aria-expanded:bg-muted outline-hidden rounded-sm flex items-center", className)}
            {...rest}
        />
    );
}

export function MenubarContent({ className, align = "start", alignOffset = -4, sideOffset = 8, ...rest }: ComponentProps<typeof MenubarPrimitive.Content>) {
    return (
        <MenubarPortal>
            <MenubarPrimitive.Content
                data-slot="menubar-content"
                align={align}
                alignOffset={alignOffset}
                sideOffset={sideOffset}
                className={cn(contentClasses, className)}
                {...rest}
            />
        </MenubarPortal>
    );
}

const contentClasses = "\
p-1 min-w-36 origin-(--radix-menubar-content-transform-origin) \
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
ring-1 \
ring-foreground/10 \
rounded-lg \
shadow-md \
overflow-hidden \
z-50";

export function MenubarItem({ className, inset, variant = "default", ...rest }: ComponentProps<typeof MenubarPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive"; }) {
    return (
        <MenubarPrimitive.Item
            data-slot="menubar-item"
            data-inset={inset}
            data-variant={variant}
            className={cn(itemClasses, className)}
            {...rest}
        />
    );
}

const itemClasses = "\
group/menubar-item relative px-1.5 py-1 text-xs \
\
focus:text-accent-foreground \
focus:bg-accent \
\
data-inset:pl-7 \
\
data-[variant=destructive]:text-destructive \
data-[variant=destructive]:focus:bg-destructive/10 \
data-[variant=destructive]:focus:text-destructive \
data-[variant=destructive]:*:[svg]:text-destructive! \
\
not-data-[variant=destructive]:focus:**:text-accent-foreground \
\
dark:data-[variant=destructive]:focus:bg-destructive/20 \
data-disabled:pointer-events-none data-disabled:opacity-50 \
\
[&_svg]:shrink-0 \
[&_svg]:pointer-events-none \
[&_svg:not([class*='size-'])]:size-4 \
\
rounded-md \
outline-hidden \
select-none \
cursor-default \
\
flex items-center gap-1.5";

export function MenubarCheckboxItem({ className, children, checked, inset, ...rest }: ComponentProps<typeof MenubarPrimitive.CheckboxItem> & { inset?: boolean; }) {
    return (
        <MenubarPrimitive.CheckboxItem
            data-slot="menubar-checkbox-item"
            data-inset={inset}
            className={cn(checkboxItemClasses, className)}
            checked={checked}
            {...rest}
        >
            <span className="absolute left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center pointer-events-none">
                <MenubarPrimitive.ItemIndicator>
                    <CheckIcon
                    />
                </MenubarPrimitive.ItemIndicator>
            </span>
            {children}
        </MenubarPrimitive.CheckboxItem>
    );
}

const checkboxItemClasses = "\
relative pl-7 pr-1.5 py-1 text-xs \
\
focus:text-accent-foreground \
focus:**:text-accent-foreground \
focus:bg-accent \
\
data-inset:pl-7 \
data-disabled:pointer-events-none \
\
[&_svg]:shrink-0 \
[&_svg]:pointer-events-none \
\
rounded-md \
outline-hidden \
select-none \
cursor-default \
flex items-center gap-1.5";

export function MenubarRadioItem({ className, children, inset, ...rest }: ComponentProps<typeof MenubarPrimitive.RadioItem> & { inset?: boolean; }) {
    return (
        <MenubarPrimitive.RadioItem
            data-slot="menubar-radio-item"
            data-inset={inset}
            className={cn(radioItemClasses, className)}
            {...rest}
        >
            <span className="absolute left-1.5 size-4 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center pointer-events-none">
                <MenubarPrimitive.ItemIndicator>
                    <CheckIcon
                    />
                </MenubarPrimitive.ItemIndicator>
            </span>
            {children}
        </MenubarPrimitive.RadioItem>
    );
}

const radioItemClasses = "\
relative pl-7 pr-1.5 py-1 text-xs \
\
data-inset:pl-7 \
data-disabled:pointer-events-none \
data-disabled:opacity-50 \
\
focus:text-accent-foreground \
focus:**:text-accent-foreground \
focus:bg-accent \
\
[&_svg]:shrink-0 \
[&_svg]:pointer-events-none \
[&_svg:not([class*='size-'])]:size-4 \
\
rounded-md \
outline-hidden \
select-none \
cursor-default \
flex items-center gap-1.5";

export function MenubarLabel({ className, inset, ...rest }: ComponentProps<typeof MenubarPrimitive.Label> & { inset?: boolean; }) {
    return (
        <MenubarPrimitive.Label
            data-slot="menubar-label"
            data-inset={inset}
            className={cn("px-1.5 py-1 text-xs font-medium data-inset:pl-7", className)}
            {...rest}
        />
    );
}

export function MenubarSeparator({ className, ...rest }: ComponentProps<typeof MenubarPrimitive.Separator>) {
    return (
        <MenubarPrimitive.Separator
            data-slot="menubar-separator"
            className={cn("-mx-1 my-1 h-px bg-border", className)}
            {...rest}
        />
    );
}

export function MenubarShortcut({ className, ...rest }: ComponentProps<"span">) {
    return <span data-slot="menubar-shortcut" className={cn("ml-auto text-xs tracking-widest text-muted-foreground group-focus/menubar-item:text-accent-foreground", className)} {...rest} />;
}

export function MenubarSub({ ...rest }: ComponentProps<typeof MenubarPrimitive.Sub>) {
    return <MenubarPrimitive.Sub data-slot="menubar-sub" {...rest} />;
}

export function MenubarSubTrigger({ className, inset, children, ...rest }: ComponentProps<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean; }) {
    return (
        <MenubarPrimitive.SubTrigger data-slot="menubar-sub-trigger" data-inset={inset} className={cn(subTriggerClasses, className)} {...rest}>
            {children}

            <ChevronRightIcon className="ml-auto size-4" />
        </MenubarPrimitive.SubTrigger>
    );
}

const subTriggerClasses = "\
px-1.5 py-1 text-xs \
\
data-inset:pl-7 \
data-open:text-accent-foreground \
data-open:bg-accent \
\
focus:text-accent-foreground \
focus:bg-accent \
\
[&_svg:not([class*='size-'])]:size-4 \
\
rounded-md \
outline-none \
select-none \
cursor-default \
flex items-center gap-1.5";

export function MenubarSubContent({ className, ...rest }: ComponentProps<typeof MenubarPrimitive.SubContent>) {
    return <MenubarPrimitive.SubContent data-slot="menubar-sub-content" className={cn(subContentClasses, className)} {...rest} />;
}

const subContentClasses = "\
p-1 min-w-32 origin-(--radix-menubar-content-transform-origin) \
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
rounded-lg \
shadow-lg \
ring-1 \
ring-foreground/10 \
overflow-hidden \
z-50";
