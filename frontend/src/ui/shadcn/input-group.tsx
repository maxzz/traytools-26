"use client";
import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { cva, type VariantProps } from "class-variance-authority";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Textarea } from "@/ui/shadcn/textarea";

export function InputGroup({ className, ...props }: ComponentProps<"div">) {
    return <div data-slot="input-group" role="group" className={cn(inputGroupClasses, className)} {...props} />;
}

const inputGroupClasses = "\
group/input-group relative w-full min-w-0 h-8 \
\
border-input \
transition-colors \
\
in-data-[slot=combobox-content]:focus-within:border-inherit \
in-data-[slot=combobox-content]:focus-within:ring-0 \
\
has-disabled:bg-input/50 \
has-disabled:opacity-50 \
\
has-[[data-slot=input-group-control]:focus-visible]:border-ring \
has-[[data-slot=input-group-control]:focus-visible]:ring-1 \
has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 \
has-[[data-slot][aria-invalid=true]]:border-destructive \
has-[[data-slot][aria-invalid=true]]:ring-1 \
has-[[data-slot][aria-invalid=true]]:ring-destructive/20 \
\
has-[>[data-align=block-end]]:h-auto \
has-[>[data-align=block-end]]:flex-col \
has-[>[data-align=block-start]]:h-auto \
has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto \
\
dark:bg-input/30 \
dark:has-disabled:bg-input/80 \
dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 \
\
has-[>[data-align=block-end]]:[&>input]:pt-3 \
has-[>[data-align=block-start]]:[&>input]:pb-3 \
has-[>[data-align=inline-end]]:[&>input]:pr-1.5 \
has-[>[data-align=inline-start]]:[&>input]:pl-1.5 \
\
border \
rounded-lg \
outline-none \
flex items-center";

const defaultClasses = "\
py-1.5 h-auto text-sm font-medium \
\
text-muted-foreground \
\
group-data-[disabled=true]/input-group:opacity-50 \
\
[&>kbd]:rounded-[calc(var(--radius)-5px)] \
[&>svg:not([class*='size-'])]:size-4 \
\
cursor-text \
select-none \
flex items-center justify-center gap-2";

const inputGroupAddonVariantsClasses = cva(defaultClasses, {
    variants: {
        align: {
            "inline-start": "order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
            "inline-end": "order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
            "block-start": "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
            "block-end": "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
        },
    },
    defaultVariants: {
        align: "inline-start",
    },
});

export function InputGroupAddon({ className, align = "inline-start", ...props }: ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariantsClasses>) {
    return (
        <div
            role="group"
            data-slot="input-group-addon"
            data-align={align}
            className={cn(inputGroupAddonVariantsClasses({ align }), className)}
            onClick={(e) => {
                if ((e.target as HTMLElement).closest("button")) {
                    return;
                }
                e.currentTarget.parentElement?.querySelector("input")?.focus();
            }}
            {...props}
        />
    );
}

const inputGroupButtonVariantsClasses = cva("text-sm shadow-none flex items-center gap-2", {
    variants: {
        size: {
            xs: "px-1.5 h-6 rounded-[calc(var(--radius)-3px)] [&>svg:not([class*='size-'])]:size-3.5 gap-1",
            sm: "",
            "icon-xs": "p-0 size-6 rounded-[calc(var(--radius)-3px)] has-[>svg]:p-0",
            "icon-sm": "p-0 size-8 has-[>svg]:p-0",
        },
    },
    defaultVariants: {
        size: "xs",
    },
});

export function InputGroupButton({ className, type = "button", variant = "ghost", size = "xs", ...props }: Omit<ComponentProps<typeof Button>, "size"> & VariantProps<typeof inputGroupButtonVariantsClasses>) {
    return (
        <Button
            type={type}
            data-size={size}
            variant={variant}
            className={cn(inputGroupButtonVariantsClasses({ size }), className)}
            {...props}
        />
    );
}

export function InputGroupText({ className, ...props }: ComponentProps<"span">) {
    return <span className={cn("text-sm text-muted-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none flex items-center gap-2", className)} {...props} />;
}

export function InputGroupInput({ className, ...props }: ComponentProps<"input">) {
    return <Input data-slot="input-group-control" className={cn(inputClasses, className)} {...props} />;
}

const inputClasses = "\
flex-1 \
\
bg-transparent \
\
focus-visible:ring-0 \
disabled:bg-transparent \
aria-invalid:ring-0 \
\
dark:bg-transparent \
dark:disabled:bg-transparent \
\
border-0 \
ring-0 \
rounded-none shadow-none";

export function InputGroupTextarea({ className, ...props }: ComponentProps<"textarea">) {
    return <Textarea data-slot="input-group-control" className={cn(textareaClasses, className)} {...props} />;
}

const textareaClasses = "\
flex-1 py-2 \
\
bg-transparent \
\
focus-visible:ring-0 \
disabled:bg-transparent \
aria-invalid:ring-0 \
\
dark:bg-transparent \
dark:disabled:bg-transparent \
\
resize-none \
border-0 \
ring-0 \
rounded-none shadow-none";
