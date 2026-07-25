import { type ComponentProps } from "react"; // 07.25.2026
import { cn } from "@/utils/classnames";

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
    return <textarea data-slot="textarea" className={cn(textareaClasses, className)} {...rest} />;
}

const textareaClasses = "\
px-2.5 py-1.25 w-full min-h-7 field-sizing-content text-xs \
\
bg-transparent \
transition-colors \
\
placeholder:text-muted-foreground \
\
focus-visible:border-ring \
focus-visible:ring-1 \
focus-visible:ring-ring/50 \
\
dark:bg-input/30 \
dark:disabled:bg-input/80 \
dark:aria-invalid:border-destructive/50 \
dark:aria-invalid:ring-destructive/40 \
\
disabled:cursor-not-allowed \
disabled:bg-input/50 \
disabled:opacity-50 \
\
aria-invalid:border-destructive \
aria-invalid:ring-1 \
aria-invalid:ring-destructive/20 \
\
rounded \
border border-input outline-none \
flex";
//text-base md:text-sm \
