import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { Tooltip as TooltipPrimitive } from "radix-ui";

export function TooltipProvider({ delayDuration = 0, ...rest }: ComponentProps<typeof TooltipPrimitive.Provider>) {
    return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...rest} />;
}

export function Tooltip({ ...rest }: ComponentProps<typeof TooltipPrimitive.Root>) {
    return <TooltipPrimitive.Root data-slot="tooltip" {...rest} />;
}

export function TooltipTrigger({ ...rest }: ComponentProps<typeof TooltipPrimitive.Trigger>) {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...rest} />;
}

export function TooltipContent({ className, sideOffset = 0, children, ...rest }: ComponentProps<typeof TooltipPrimitive.Content>) {
    return (
        <TooltipPrimitive.Portal>

            <TooltipPrimitive.Content data-slot="tooltip-content" sideOffset={sideOffset} className={cn(contentClasses, className)} {...rest}>
                {children}
                <TooltipPrimitive.Arrow className="size-2.5 bg-foreground fill-foreground rounded-xs z-50 translate-y-[calc(-50%-2px)] rotate-45" />
            </TooltipPrimitive.Content>

        </TooltipPrimitive.Portal>
    );
}

const contentClasses = "\
px-3 py-1.5 w-fit max-w-xs text-xs origin-(--radix-tooltip-content-transform-origin) \
\
text-background \
bg-foreground \
\
has-data-[slot=kbd]:pr-1.5 \
\
data-[side=bottom]:slide-in-from-top-2 \
data-[side=left]:slide-in-from-right-2 \
data-[side=right]:slide-in-from-left-2 \
data-[side=top]:slide-in-from-bottom-2 \
\
**:data-[slot=kbd]:relative \
**:data-[slot=kbd]:isolate \
**:data-[slot=kbd]:z-50 \
**:data-[slot=kbd]:rounded-sm \
\
data-[state=delayed-open]:animate-in \
data-[state=delayed-open]:fade-in-0 \
data-[state=delayed-open]:zoom-in-95 \
\
data-open:animate-in \
data-open:fade-in-0 \
data-open:zoom-in-95 \
\
data-closed:animate-out \
data-closed:fade-out-0 \
data-closed:zoom-out-95 \
\
rounded \
inline-flex items-center gap-1.5 \
z-50";
