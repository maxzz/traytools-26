"use client";
import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { type VariantProps, cva } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";

export function Tabs({ className, orientation = "horizontal", ...rest }: ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            data-orientation={orientation}
            className={cn("group/tabs data-horizontal:flex-col flex gap-2", className)}
            {...rest}
        />
    );
}

export const tabsListVariantsClasses = cva("\
group/tabs-list p-[3px] w-fit \
\
text-muted-foreground \
\
group-data-horizontal/tabs:h-8 \
group-data-vertical/tabs:h-fit \
group-data-vertical/tabs:flex-col \
\
data-[variant=line]:rounded-none \
\
rounded-lg \
inline-flex items-center justify-center",
    {
        variants: {
            variant: {
                default: "bg-muted",
                line: "gap-1 bg-transparent",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
); //export { tabsListVariantsClasses as tabsListVariants }; renamed to help tailwindcss to find the classes

export function TabsList({ className, variant = "default", ...rest }: ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariantsClasses>) {
    return (
        <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariantsClasses({ variant }), className)} {...rest} />
    );
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(triggerClasses, className)} {...rest} />
    );
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content data-slot="tabs-content" className={cn("text-sm outline-none flex-1", className)} {...rest} />
    );
}

const triggerClasses = "\
relative flex-1 px-1.5 py-0.5 h-[calc(100%-1px)] text-xs font-medium \
whitespace-nowrap \
\
text-foreground/60 \
transition-all \
\
hover:text-foreground \
\
dark:text-muted-foreground \
dark:hover:text-foreground \
\
group-data-vertical/tabs:w-full \
group-data-vertical/tabs:justify-start \
\
focus-visible:border-ring \
focus-visible:ring-[3px] \
focus-visible:ring-ring/50 \
focus-visible:outline-1 \
focus-visible:outline-ring \
\
disabled:pointer-events-none \
disabled:opacity-50 \
\
has-data-[icon=inline-end]:pr-1 \
has-data-[icon=inline-start]:pl-1 \
\
group-data-[variant=default]/tabs-list:data-active:shadow-sm \
group-data-[variant=line]/tabs-list:data-active:shadow-none \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
rounded-md \
border border-transparent \
inline-flex items-center justify-center gap-1.5 \
\
\
\
group-data-[variant=line]/tabs-list:bg-transparent \
group-data-[variant=line]/tabs-list:data-active:bg-transparent \
\
dark:group-data-[variant=line]/tabs-list:data-active:border-transparent \
dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent \
\
\
\
data-active:bg-background \
data-active:text-foreground \
\
dark:data-active:border-input \
dark:data-active:bg-input/30 \
dark:data-active:text-foreground \
\
\
\
after:absolute \
after:bg-foreground \
after:opacity-0 \
after:transition-opacity \
\
group-data-horizontal/tabs:after:inset-x-0 \
group-data-horizontal/tabs:after:-bottom-1.25 \
group-data-horizontal/tabs:after:h-0.5 \
\
group-data-vertical/tabs:after:inset-y-0 \
group-data-vertical/tabs:after:-right-1 \
group-data-vertical/tabs:after:w-0.5 \
group-data-[variant=line]/tabs-list:data-active:after:opacity-100";
