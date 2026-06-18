import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

export function RadioGroup({ className, ...rest }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
    return (
        <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("w-full grid gap-2", className)} {...rest} />
    );
}

export function RadioGroupItem({ className, ...rest }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
    return (
        <RadioGroupPrimitive.Item data-slot="radio-group-item" className={cn(itemClasses, className)} {...rest}>
            <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className="size-4 flex items-center justify-center">
                <span className="absolute top-1/2 left-1/2 size-2 bg-primary-foreground rounded-full -translate-x-1/2 -translate-y-1/2" />
            </RadioGroupPrimitive.Indicator>
        </RadioGroupPrimitive.Item>
    );
}

const itemClasses = "\
group/radio-group-item peer relative shrink-0 aspect-square size-4 \
\
after:absolute \
after:-inset-x-3 \
after:-inset-y-2 \
\
dark:bg-input/30 \
dark:aria-invalid:border-destructive/50 \
dark:aria-invalid:ring-destructive/40 \
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
data-checked:border-primary \
data-checked:bg-primary \
data-checked:text-primary-foreground \
\
rounded-full \
border \
border-input \
outline-none \
flex \
";
