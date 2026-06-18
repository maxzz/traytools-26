import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { Switch as SwitchPrimitive } from "radix-ui";

export function Switch({ className, size = "default", ...rest }: ComponentProps<typeof SwitchPrimitive.Root> & { size?: "sm" | "default"; }) {
    return (
        <SwitchPrimitive.Root data-slot="switch" data-size={size} className={cn(switchClasses, className)} {...rest}>
            <SwitchPrimitive.Thumb data-slot="switch-thumb" className={thumbClasses} />
        </SwitchPrimitive.Root>
    );
}

const switchClasses = "\
peer group/switch shrink-0 relative \
\
transition-all \
\
after:absolute \
after:-inset-x-3 \
after:-inset-y-2 \
\
focus-visible:border-ring \
focus-visible:ring-1 \
focus-visible:ring-ring/50 \
\
aria-invalid:border-destructive \
aria-invalid:ring-1 \
aria-invalid:ring-destructive/20 \
\
data-[size=default]:h-[18.4px] \
data-[size=default]:w-8 \
data-[size=sm]:h-3.5 \
data-[size=sm]:w-6 \
\
dark:aria-invalid:border-destructive/50 \
dark:aria-invalid:ring-destructive/40 \
\
data-checked:bg-primary \
data-unchecked:bg-input \
\
dark:data-unchecked:bg-input/80 \
data-disabled:cursor-not-allowed \
data-disabled:opacity-50 \
\
rounded-full \
border \
border-transparent \
outline-none \
inline-flex items-center";

const thumbClasses = "\
block \
\
bg-background \
transition-transform \
\
group-data-[size=default]/switch:size-4 \
group-data-[size=sm]/switch:size-3 \
group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] \
group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] \
\
group-data-[size=default]/switch:data-unchecked:translate-x-0 \
group-data-[size=sm]/switch:data-unchecked:translate-x-0 \
\
dark:data-checked:bg-primary-foreground \
dark:data-unchecked:bg-foreground \
\
ring-0 \
rounded-full \
pointer-events-none";
