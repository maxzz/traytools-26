"use client"; // 05.09.26
import { type ComponentProps } from "react";
import { cn } from "@/utils/classnames";
import { Label as LabelPrimitive } from "radix-ui";

export function Label({ className, ...rest }: ComponentProps<typeof LabelPrimitive.Root>) {
    return (
        <LabelPrimitive.Root data-slot="label" className={cn(labelClasses, className)} {...rest} />
    );
}

const labelClasses: string = "\
font-medium \
text-xs \
leading-none \
\
group-data-[disabled=true]:pointer-events-none \
group-data-[disabled=true]:opacity-50 \
\
peer-disabled:cursor-not-allowed \
peer-disabled:opacity-50 \
\
select-none \
flex items-center gap-2";
