import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
    return (
        <input data-slot="input" className={cn(inputClasses, className)} type={type} {...props} />
    );
}

const inputClasses = "\
px-2.5 py-1 w-full min-w-0 h-8 \
\
text-xs \
bg-transparent \
transition-colors \
\
placeholder:text-muted-foreground \
\
dark:bg-input/30 \
dark:disabled:bg-input/80 \
dark:aria-invalid:border-destructive/50 \
dark:aria-invalid:ring-destructive/40 \
\
focus-visible:border-ring \
focus-visible:ring-1 \
focus-visible:ring-ring/50 \
\
disabled:pointer-events-none \
disabled:cursor-not-allowed \
disabled:bg-input/50 \
disabled:opacity-50 \
\
aria-invalid:border-destructive \
aria-invalid:ring-1 \
aria-invalid:ring-destructive/20 \
\
file:inline-flex \
file:h-6 \
file:border-0 \
file:bg-transparent \
file:text-sm \
file:font-medium \
file:text-foreground \
\
rounded-sm \
outline-none \
border \
border-input \
";
//md:text-sm \
