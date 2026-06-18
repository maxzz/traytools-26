import { type ComponentProps } from "react";
import { cn } from "@/utils/classnames";

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
    return <textarea data-slot="textarea" className={cn(textareaClasses, className)} {...rest} />;
}

const textareaClasses = "\
px-2.5 py-2 w-full min-h-16 field-sizing-content \
text-xs \
\
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
disabled:cursor-not-allowed \
disabled:bg-input/50 \
disabled:opacity-50 \
\
aria-invalid:border-destructive \
aria-invalid:ring-1 \
aria-invalid:ring-destructive/20 \
\
rounded-lg \
border border-input outline-none \
flex";
//text-base md:text-sm \
