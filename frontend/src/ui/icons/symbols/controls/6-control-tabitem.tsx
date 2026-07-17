import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolControlTabItem() {
    return (
        <symbol id="control-tabitem" viewBox="0 0 24 24">
            {/* header tabs inactive */}
            <path
                d="M15.8,6.37v2.69h-3.99v-2.69c0-1.37-1.11-2.47-2.47-2.47h3.98c1.37,0,2.48,1.1,2.48,2.47Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.65"
            />
            {/* header tabs active */}
            <path
                d="M11.81,6.37v2.69H2.7v-2.69c0-1.37,1.11-2.47,2.48-2.47h4.16c1.36,0,2.47,1.1,2.47,2.47Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.65"
            />

            {/* content */}
            <path
                d="M2.71,9.06h16.74c1.02,0,1.85.83,1.85,1.85v7.34c0,1.02-.83,1.85-1.85,1.85H4.56c-1.02,0-1.85-.83-1.85-1.85v-9.19h0Z"
                fill="currentColor"
                opacity="0.3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
        </symbol>
    );
}

export function SymbolControlTabItem({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-tabitem" />
        </svg>
    );
}

