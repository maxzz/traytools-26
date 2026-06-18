import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

export function DropdownMenu({ ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...rest} />;
}

export function DropdownMenuPortal({ ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
    return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...rest} />;
}

export function DropdownMenuTrigger({ ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
    return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...rest} />;
}

export function DropdownMenuContent({ className, align = "start", sideOffset = 4, ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                align={align}
                className={cn(contentClasses, className)}
                {...rest}
            />
        </DropdownMenuPrimitive.Portal>
    );
}

const contentClasses = "\
p-1 w-(--radix-dropdown-menu-trigger-width) min-w-32 max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) \
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
data-[state=closed]:overflow-hidden \
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
shadow-md \
ring-1 \
ring-foreground/10 \
overflow-x-hidden \
overflow-y-auto \
z-50";

export function DropdownMenuGroup({ ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Group>) {
    return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...rest} />;
}

export function DropdownMenuItem({ className, inset, variant = "default", ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive"; }) {
    return <DropdownMenuPrimitive.Item data-slot="dropdown-menu-item" data-inset={inset} data-variant={variant} className={cn(itemClasses, className)} {...rest} />;
}

const itemClasses = "\
group/dropdown-menu-item relative px-1.5 py-1 text-xs \
\
focus:text-accent-foreground \
focus:bg-accent \
\
not-data-[variant=destructive]:focus:**:text-accent-foreground \
\
data-inset:pl-7 \
data-[variant=destructive]:text-destructive \
data-[variant=destructive]:focus:bg-destructive/10 \
data-[variant=destructive]:focus:text-destructive \
\
data-[variant=destructive]:*:[svg]:text-destructive \
dark:data-[variant=destructive]:focus:bg-destructive/20 \
\
data-disabled:pointer-events-none \
data-disabled:opacity-50 \
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

export function DropdownMenuCheckboxItem({ className, children, checked, inset, ...rest }: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & { inset?: boolean; }) {
    return (
        <DropdownMenuPrimitive.CheckboxItem data-slot="dropdown-menu-checkbox-item" data-inset={inset} className={cn(checkboxItemClasses, className)} checked={checked} {...rest}>

            <span data-slot="dropdown-menu-checkbox-item-indicator" className="absolute right-2 flex items-center justify-center pointer-events-none">
                <DropdownMenuPrimitive.ItemIndicator>
                    <CheckIcon />
                </DropdownMenuPrimitive.ItemIndicator>
            </span>

            {children}
        </DropdownMenuPrimitive.CheckboxItem>
    );
}

const checkboxItemClasses = "\
relative pl-1.5 pr-8 py-1 text-xs \
\
focus:text-accent-foreground \
focus:bg-accent \
focus:**:text-accent-foreground \
\
data-inset:pl-7 \
data-disabled:pointer-events-none \
data-disabled:opacity-50 \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
cursor-default \
rounded-md \
outline-hidden \
select-none \
flex items-center gap-1.5";

export function DropdownMenuRadioGroup({ ...rest }: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
    return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...rest} />;
}

export function DropdownMenuRadioItem({ className, children, inset, ...rest }: ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & { inset?: boolean; }) {
    return (
        <DropdownMenuPrimitive.RadioItem data-slot="dropdown-menu-radio-item" data-inset={inset} className={cn(radioItemClasses, className)} {...rest}>

            <span data-slot="dropdown-menu-radio-item-indicator" className="absolute right-2 flex items-center justify-center pointer-events-none">
                <DropdownMenuPrimitive.ItemIndicator>
                    <CheckIcon />
                </DropdownMenuPrimitive.ItemIndicator>
            </span>

            {children}
        </DropdownMenuPrimitive.RadioItem>
    );
}

const radioItemClasses = "\
relative pl-1.5 pr-8 py-1 text-xs \
\
focus:text-accent-foreground \
focus:bg-accent \
focus:**:text-accent-foreground \
\
data-inset:pl-7 \
data-disabled:pointer-events-none \
data-disabled:opacity-50 \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
cursor-default \
rounded-md \
outline-hidden \
select-none \
flex items-center gap-1.5";

export function DropdownMenuLabel({ className, inset, ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean; }) {
    return <DropdownMenuPrimitive.Label data-slot="dropdown-menu-label" data-inset={inset} className={cn("px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7", className)} {...rest} />;
}

export function DropdownMenuSeparator({ className, ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
    return <DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...rest} />;
}

export function DropdownMenuShortcut({ className, ...rest }: ComponentProps<"span">) {
    return <span data-slot="dropdown-menu-shortcut" className={cn("ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground", className)} {...rest} />;
}

export function DropdownMenuSub({ ...rest }: ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
    return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...rest} />;
}

export function DropdownMenuSubTrigger({ className, inset, children, ...rest }: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean; }) {
    return (
        <DropdownMenuPrimitive.SubTrigger data-slot="dropdown-menu-sub-trigger" data-inset={inset} className={cn(subTriggerClasses, className)} {...rest}>
            {children}

            <ChevronRightIcon className="ml-auto" />
        </DropdownMenuPrimitive.SubTrigger>
    );
}

const subTriggerClasses = "\
px-1.5 py-1 text-xs \
\
focus:text-accent-foreground \
focus:bg-accent \
\
not-data-[variant=destructive]:focus:**:text-accent-foreground \
\
data-inset:pl-7 \
data-open:text-accent-foreground \
data-open:bg-accent \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
rounded-md \
outline-hidden \
cursor-default \
select-none \
flex items-center gap-1.5";

export function DropdownMenuSubContent({ className, ...rest }: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
    return <DropdownMenuPrimitive.SubContent data-slot="dropdown-menu-sub-content" className={cn(subContentClasses, className)} {...rest} />;
}

const subContentClasses = "\
p-1 min-w-24 origin-(--radix-dropdown-menu-content-transform-origin) \
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
shadow-lg \
overflow-hidden \
rounded-lg \
ring-1 \
ring-foreground/10 \
z-50";
