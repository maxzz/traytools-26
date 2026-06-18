"use client";
import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { Popover as PopoverPrimitive } from "radix-ui";

export function Popover({ ...rest }: ComponentProps<typeof PopoverPrimitive.Root>) {
    return <PopoverPrimitive.Root data-slot="popover" {...rest} />;
}

export function PopoverTrigger({ ...rest }: ComponentProps<typeof PopoverPrimitive.Trigger>) {
    return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...rest} />;
}

export function PopoverContent({ className, align = "center", sideOffset = 4, ...rest }: ComponentProps<typeof PopoverPrimitive.Content>) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                data-slot="popover-content"
                align={align}
                sideOffset={sideOffset}
                className={cn(contentClasses, className)}
                {...rest}
            />
        </PopoverPrimitive.Portal>
    );
}

const contentClasses = "\
p-2.5 w-72 \
text-xs \
origin-(--radix-popover-content-transform-origin) \
text-popover-foreground \
bg-popover \
duration-100 \
ring-1 \
ring-foreground/10 \
outline-hidden \
\
data-[side=bottom]:slide-in-from-top-2 \
data-[side=left]:slide-in-from-right-2 \
data-[side=right]:slide-in-from-left-2 \
data-[side=top]:slide-in-from-bottom-2 \
\
data-open:animate-in \
data-open:fade-in-0 \
data-open:zoom-in-95 \
data-closed:animate-out \
data-closed:fade-out-0 \
data-closed:zoom-out-95 \
\
rounded-lg \
shadow-md \
flex flex-col gap-2.5 \
z-50 \
";

export function PopoverAnchor({ ...rest }: ComponentProps<typeof PopoverPrimitive.Anchor>) {
    return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...rest} />;
}

export function PopoverHeader({ className, ...rest }: ComponentProps<"div">) {
    return <div data-slot="popover-header" className={cn("text-xs flex flex-col gap-0.5", className)} {...rest} />;
}

export function PopoverTitle({ className, ...rest }: ComponentProps<"h2">) {
    return <div data-slot="popover-title" className={cn("font-medium", className)} {...rest} />;
}

export function PopoverDescription({ className, ...rest }: ComponentProps<"p">) {
    return <p data-slot="popover-description" className={cn("text-muted-foreground", className)} {...rest} />;
}
