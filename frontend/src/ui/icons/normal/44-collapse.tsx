import { type HTMLAttributes } from "react";
import { classNames } from "@/utils";

export function IconCollapse({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current stroke-[1.5px]", className)} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <polyline points="9.72 11.75 6.74 8.74 3.72 11.73" />
            <line x1="6.74" y1="19.26" x2="6.74" y2="8.74" />
            <line x1="12.74" y1="8.74" x2="21.23" y2="8.74" />
            <line x1="2.77" y1="4.74" x2="21.23" y2="4.74" />
        </svg>
    );
}
