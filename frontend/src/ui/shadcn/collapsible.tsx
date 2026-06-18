"use client";
import { type ComponentProps } from "react"; // 05.09.26
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

export function Collapsible({ ...rest }: ComponentProps<typeof CollapsiblePrimitive.Root>) {
    return <CollapsiblePrimitive.Root data-slot="collapsible" {...rest} />;
}

export function CollapsibleTrigger({ ...rest }: ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
    return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...rest} />;
}

export function CollapsibleContent({ ...rest }: ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
    return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" {...rest} />;
}
