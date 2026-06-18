"use client";
import { type ComponentProps } from "react"; // 05.08.26, 04.06.26
import { cn } from "@/utils/classnames";
import { XIcon } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Dialog as DialogPrimitive } from "radix-ui";

export function Dialog({ ...rest }: ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="dialog" {...rest} />;
}

export function DialogTrigger({ ...rest }: ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...rest} />;
}

export function DialogPortal({ ...rest }: ComponentProps<typeof DialogPrimitive.Portal>) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...rest} />;
}

/**
 * @example
 * <DialogClose asChild>
 *     <Button variant="outline">
 *         Close
 *     </Button>
 * </DialogClose>
 */
export function DialogClose({ ...rest }: ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...rest} />;
}

const overlayClasses = "\
fixed inset-0 z-50 isolate \
\
bg-background/30 \
1duration-100 \
\
supports-backdrop-filter:backdrop-blur-[1px] \
\
data-open:animate-in \
data-open:fade-in-0 \
data-closed:animate-out \
data-closed:fade-out-0"; // original has bg-black/10 
// data-closed:fade-out-0"; // original has bg-black/10 

export function DialogOverlay({ className, ...rest }: ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn(overlayClasses, className)} {...rest} />
    );
}

export function DialogOverlayWithScroll({ className, ...rest }: ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <div className={cn(overlayClasses, className)} {...rest} />
    );
}

export const DialogContentClasses = "\
fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 \
p-6 w-full md:w-full max-w-lg \
\
bg-background \
\
data-open:animate-in \
data-open:fade-in-0 \
data-open:zoom-in-95 \
\
data-closed:animate-out \
data-closed:fade-out-0 \
data-closed:zoom-out-95 \
\
border sm:rounded-lg shadow-lg \
duration-200 \
grid gap-4";
//tm:
//data-open:slide-in-from-left-1/2 \
//data-open:slide-in-from-top-[48%] \
//data-closed:slide-out-to-left-1/2 \
//data-closed:slide-out-to-top-[48%] \
//original: "
// fixed top-1/2 left-1/2 z-50 
// grid 
// w-full 
// max-w-[calc(100%-2rem)] 
// -translate-x-1/2 
// -translate-y-1/2 
// gap-4 
// rounded-xl 
// bg-popover 
// p-4 
// text-sm 
// text-popover-foreground 
// ring-1 ring-foreground/10 duration-100 
// outline-none 
// sm:max-w-sm 
//
// data-open:animate-in 
// data-open:fade-in-0 
// data-open:zoom-in-95 
//
// data-closed:animate-out 
// data-closed:fade-out-0 
// data-closed:zoom-out-95
// "

const closeButtonClasses = "relative! right-0! top-0! p-2 hover:text-white hover:bg-red-500 hover:opacity-100 focus:ring-0 active:scale-[.97]";
const closeButton2Classes = "absolute right-2 top-2";

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
    modal?: boolean;
    noClose?: boolean;
    withScroll?: boolean; // by default DialogContent has no scroll for popups
    hiddenTitle?: string; // If headenTitle is not provided, then parent component should provide own Prim.Title (same for aria-describedby)
    overlayClasses?: string;
};

const preventClose = (e: Event) => e.preventDefault();

export function DialogContent({ className, children, noClose, modal, onPointerDownOutside, withScroll, hiddenTitle, ...rest }: DialogContentProps) {
    return (
        <DialogPortal>
            <DialogOverlay />
            {withScroll ? <DialogOverlayWithScroll className={overlayClasses} /> : <DialogOverlay className={overlayClasses} />}

            <DialogPrimitive.Content
                className={cn(DialogContentClasses, className)}
                onPointerDownOutside={modal ? preventClose : onPointerDownOutside}
                data-slot="dialog-content"
                {...rest}
            >
                {hiddenTitle && <DialogTitle className="sr-only">{hiddenTitle}</DialogTitle>}

                {children}

                {!noClose && (
                    <DialogPrimitive.Close data-slot="dialog-close" asChild>
                        <Button variant="ghost" className={closeButton2Classes} size="icon-sm" tabIndex={-1}>
                            <XIcon />
                            <span className="sr-only">Close</span>
                        </Button>
                    </DialogPrimitive.Close>

                )}
            </DialogPrimitive.Content>
        </DialogPortal >
    );
}

export function DialogHeader({ className, ...rest }: ComponentProps<"div">) {
    return (
        <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...rest} />
    );
}

export function DialogFooter({ className, showCloseButton = false, children, ...rest }: ComponentProps<"div"> & { showCloseButton?: boolean; }) {
    return (
        <div data-slot="dialog-footer" className={cn("p-4 bg-muted/50 sm:flex-row sm:justify-end border-t rounded-b-xl flex flex-col-reverse gap-2 -mx-4 -mb-4", className)} {...rest}>
            {children}

            {showCloseButton && (
                <DialogPrimitive.Close asChild>
                    <Button variant="outline">
                        Close
                    </Button>
                </DialogPrimitive.Close>
            )}
        </div>
    );
}

export function DialogTitle({ className, ...rest }: ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("text-base font-heading font-medium leading-none", className)}
            {...rest}
        />
    );
}

export function DialogDescription({ className, ...rest }: ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", className)}
            {...rest}
        />
    );
}
