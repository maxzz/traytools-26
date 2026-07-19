"use client";
import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

export function Checkbox({ className, ...rest }: ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root data-slot="checkbox" className={cn(checkboxClasses, className)} {...rest}>

            <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="[&>svg]:size-3.5 text-current transition-none grid place-content-center">
                <CheckIcon />
            </CheckboxPrimitive.Indicator>

        </CheckboxPrimitive.Root>
    );
}

const checkboxClasses = "\
peer relative shrink-0 size-4 \
\
group-has-disabled/field:opacity-50 \
\
transition-colors \
\
dark:bg-input/30 \
dark:aria-invalid:border-destructive/50 \
dark:aria-invalid:ring-destructive/40 \
\
data-checked:border-primary \
data-checked:bg-primary \
data-checked:text-primary-foreground \
dark:data-checked:bg-primary \
\
focus-visible:border-ring \
focus-visible:ring-1 \
focus-visible:ring-ring/50 \
\
disabled:cursor-not-allowed \
disabled:opacity-50 \
\
aria-invalid:border-destructive \
aria-invalid:ring-1 \
aria-invalid:ring-destructive/20 \
aria-invalid:aria-checked:border-primary \
\
after:absolute \
after:-inset-x-3 \
after:-inset-y-2 \
\
rounded \
border \
border-input \
outline-none \
flex items-center justify-center";
