import { forwardRef, type ElementRef, type ComponentPropsWithoutRef, type ComponentProps } from "react"; //01.17.26
import { ScrollArea as Prim } from "radix-ui"
import { cn } from "@/utils";

export type ScrollAreaProps = ComponentProps<typeof Prim.Root> & {
    horizontal?: boolean;           // adds horizontal scrollbar
    fullHeight?: boolean;           // sets ScrollArea height to 100%
    fixedWidth?: boolean;           // prevents ScrollArea width from growing; i.e. removes display: table from Prim.Viewport
    parentContentWidth?: boolean;   // allows to truncate items to parent width
    viewportClassName?: string;     // additional class name for the viewport element
    viewportProps?: ComponentPropsWithoutRef<typeof Prim.Viewport>;
};

/**
 * Additinal attribute ``data-fixed-width`` is used to prevent ScrollArea width from growing.
 * This is done by removing ``display: table`` from Prim.Viewport first utility div.
 * 
 * ``[&[data-fixed-width]>div>div]:block!``
 * https://github.com/radix-ui/primitives/blob/main/packages/react/scroll-area/src/ScrollArea.tsx#L177
 * `display: table` ensures our content div will match the size of its children in both
 * horizontal and vertical axis so we can determine if scroll width/height changed and
 * recalculate thumb sizes. This doesn't account for children with *percentage*
 * widths that change. We'll wait to see what use-cases consumers come up with there
 * before trying to resolve it.
 * 
 * const fixedWidthClasses = "[&[data-fixed-width]_[data-radix-scroll-area-content]]:block!";
 */
const fullHeightClasses = "[&_[data-radix-scroll-area-viewport]>div]:h-full";
const fixedWidthClasses = "[&_[data-radix-scroll-area-viewport]>div]:block!"; // to block: display: table
const parentContentWidthClasses = "**:data-radix-scroll-area-content:min-w-0!";

export function ScrollArea({ className, children, horizontal, fixedWidth, fullHeight, parentContentWidth, viewportClassName, viewportProps, ref, ...rest }: ScrollAreaProps) {
    return (
        <Prim.Root ref={ref}
            className={cn(
                "relative overflow-hidden",
                fullHeight && fullHeightClasses,
                fixedWidth && fixedWidthClasses,
                parentContentWidth && parentContentWidthClasses,
                className
            )}
            {...rest}
        >
            <Prim.Viewport className={cn("h-full w-full rounded-[inherit]", viewportClassName)} {...viewportProps}>
                {children}
            </Prim.Viewport>

            <ScrollBar />
            {horizontal && <ScrollBar orientation="horizontal" />}

            <Prim.Corner />
        </Prim.Root>
    );
}

/**
 * ScrollArea2 - The same as ScrollArea but with ref on the viewport element to have ability to preserve scroll position
 */
export function ScrollArea2({ className, children, horizontal, fixedWidth, fullHeight, parentContentWidth, ref, ...rest }: ScrollAreaProps) {
    return (
        <Prim.Root
            className={cn(
                "relative overflow-hidden",
                fullHeight && fullHeightClasses,
                fixedWidth && fixedWidthClasses,
                parentContentWidth && parentContentWidthClasses,
                className
            )}
            {...rest}
        >
            <Prim.Viewport ref={ref} className="h-full w-full rounded-[inherit]">
                {children}
            </Prim.Viewport>

            <ScrollBar />
            {horizontal && <ScrollBar orientation="horizontal" />}

            <Prim.Corner />
        </Prim.Root>
    );
}

export function ScrollBar({ className, orientation = "vertical", ...rest }: ComponentProps<typeof Prim.ScrollAreaScrollbar>) {
    return (
        <Prim.ScrollAreaScrollbar
            orientation={orientation}
            className={cn(
                "select-none transition-colors flex touch-none",
                orientation === "vertical" && "w-2.5 h-full border-l border-l-transparent p-px",
                orientation === "horizontal" && "h-2.5 border-t border-t-transparent p-px",
                className
            )}
            {...rest}
        >
            <Prim.ScrollAreaThumb className={cn("relative bg-border rounded-full", orientation === "vertical" && "flex-1")} />
            
        </Prim.ScrollAreaScrollbar>
    );
}
