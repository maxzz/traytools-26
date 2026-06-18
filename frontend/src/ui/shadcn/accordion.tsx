import { type ComponentProps } from "react"; // 05.09.26
import { cn } from "@/utils/classnames";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";

export function Accordion({ className, ...rest }: ComponentProps<typeof AccordionPrimitive.Root>) {
    return (
        <AccordionPrimitive.Root data-slot="accordion" className={cn("w-full flex flex-col", className)} {...rest} />
    );
}

export function AccordionItem({ className, ...rest }: ComponentProps<typeof AccordionPrimitive.Item>) {
    return (
        <AccordionPrimitive.Item data-slot="accordion-item" className={cn("not-last:border-b", className)} {...rest} />
    );
}

export function AccordionTrigger({ className, children, showIcon = true, ...rest }: ComponentProps<typeof AccordionPrimitive.Trigger> & { showIcon?: boolean; }) {
    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger data-slot="accordion-trigger" className={cn(triggerClasses, className)} {...rest}>

                {children}

                {showIcon && (<>
                    <ChevronDownIcon data-slot="accordion-trigger-icon" className="shrink-0 group-aria-expanded/accordion-trigger:hidden pointer-events-none" />
                    <ChevronUpIcon data-slot="accordion-trigger-icon" className="shrink-0 hidden group-aria-expanded/accordion-trigger:inline pointer-events-none" />
                </>)}

            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
}

export function AccordionContent({ className, children, ...rest }: ComponentProps<typeof AccordionPrimitive.Content>) {
    return (
        <AccordionPrimitive.Content
            data-slot="accordion-content"
            className="text-sm data-open:animate-accordion-down data-closed:animate-accordion-up overflow-hidden"
            {...rest}
        >
            <div className={cn(contentClasses, className)}>
                {children}
            </div>
        </AccordionPrimitive.Content>
    );
}

const triggerClasses = "group/accordion-trigger \
relative flex-1 py-2.5 \
\
font-medium \
text-xs \
text-left \
\
transition-all \
\
hover:underline \
\
focus-visible:border-ring \
focus-visible:ring-1 \
focus-visible:ring-ring/50 \
focus-visible:after:border-ring \
\
disabled:pointer-events-none \
disabled:opacity-50 \
\
**:data-[slot=accordion-trigger-icon]:ml-auto \
**:data-[slot=accordion-trigger-icon]:size-4 \
**:data-[slot=accordion-trigger-icon]:text-muted-foreground \
\
rounded-lg \
outline-none \
border border-transparent \
flex items-start justify-between";

const contentClasses = "\
pt-0 pb-2.5 h-(--radix-accordion-content-height) \
\
[&_a]:underline \
[&_a]:underline-offset-3 \
[&_a]:hover:text-foreground \
[&_p:not(:last-child)]:mb-4 \
";
