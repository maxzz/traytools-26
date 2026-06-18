import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { SearchIcon, CheckIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/ui/shadcn/dialog";
import { InputGroup, InputGroupAddon, } from "@/ui/shadcn/input-group";
import { Command as CommandPrimitive } from "cmdk";

export function Command({ className, ...rest }: ComponentProps<typeof CommandPrimitive>) {
    return (
        <CommandPrimitive
            data-slot="command"
            className={cn("p-1 size-full text-popover-foreground bg-popover rounded-xl! overflow-hidden flex flex-col", className)}
            {...rest}
        />
    );
}

export function CommandDialog({
    title = "Command Palette",
    description = "Search for a command to run...",
    children,
    className,
    showCloseButton = false,
    ...rest
}: ComponentProps<typeof Dialog> & { title?: string; description?: string; className?: string; showCloseButton?: boolean; }) {
    return (
        <Dialog {...rest}>
            <DialogHeader className="sr-only">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <DialogContent className={cn("top-1/3 p-0 rounded-xl! overflow-hidden translate-y-0", className)} noClose={!showCloseButton}>
                {children}
            </DialogContent>
        </Dialog>
    );
}

export function CommandInput({ className, ...rest }: ComponentProps<typeof CommandPrimitive.Input>) {
    return (
        <div data-slot="command-input-wrapper" className="p-1 pb-0">
            <InputGroup className="h-8! bg-input/30 *:data-[slot=input-group-addon]:pl-2! border-input/30 rounded-lg! shadow-none!">
                <CommandPrimitive.Input
                    data-slot="command-input"
                    className={cn("w-full text-sm disabled:opacity-50 outline-hidden disabled:cursor-not-allowed", className)}
                    {...rest}
                />

                <InputGroupAddon>
                    <SearchIcon className="shrink-0 size-4 opacity-50" />
                </InputGroupAddon>
            </InputGroup>
        </div>
    );
}

export function CommandList({ className, ...rest }: ComponentProps<typeof CommandPrimitive.List>) {
    return (
        <CommandPrimitive.List
            data-slot="command-list"
            className={cn("max-h-72 scroll-py-1 outline-none overflow-x-hidden overflow-y-auto no-scrollbar", className)}
            {...rest}
        />
    );
}

export function CommandEmpty({ className, ...rest }: ComponentProps<typeof CommandPrimitive.Empty>) {
    return <CommandPrimitive.Empty data-slot="command-empty" className={cn("py-6 text-sm text-center", className)} {...rest} />;
}

export function CommandGroup({ className, ...rest }: ComponentProps<typeof CommandPrimitive.Group>) {
    return <CommandPrimitive.Group data-slot="command-group" className={cn(groupClasses, className)} {...rest} />;
}

const groupClasses = "\
p-1 \
\
text-foreground \
\
**:[[cmdk-group-heading]]:px-2 \
**:[[cmdk-group-heading]]:py-1.5 \
**:[[cmdk-group-heading]]:text-xs \
**:[[cmdk-group-heading]]:font-medium \
**:[[cmdk-group-heading]]:text-muted-foreground \
\
overflow-hidden";

export function CommandSeparator({ className, ...rest }: ComponentProps<typeof CommandPrimitive.Separator>) {
    return <CommandPrimitive.Separator data-slot="command-separator" className={cn("-mx-1 h-px bg-border", className)} {...rest} />;
}

export function CommandItem({ className, children, ...rest }: ComponentProps<typeof CommandPrimitive.Item>) {
    return (
        <CommandPrimitive.Item data-slot="command-item" className={cn(itemClasses, className)} {...rest} >
            {children}

            <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
        </CommandPrimitive.Item>
    );
}

const itemClasses = "\
group/command-item relative px-2 py-1.5 text-sm \
\
in-data-[slot=dialog-content]:rounded-lg! \
\
data-[disabled=true]:pointer-events-none \
data-[disabled=true]:opacity-50 \
data-selected:bg-muted \
data-selected:text-foreground \
\
[&_svg]:pointer-events-none \
[&_svg]:shrink-0 \
[&_svg:not([class*='size-'])]:size-4 \
\
data-selected:*:[svg]:text-foreground \
\
outline-hidden \
rounded-sm \
select-none \
cursor-default \
flex items-center gap-2";

export function CommandShortcut({ className, ...rest }: ComponentProps<"span">) {
    return (
        <span
            data-slot="command-shortcut"
            className={cn("ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground", className)}
            {...rest}
        />
    );
}
