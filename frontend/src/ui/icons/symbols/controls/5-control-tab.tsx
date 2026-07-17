import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolControlTab() {
    return (
        <symbol id="control-tab" viewBox="0 0 24 24">
            {/* window edge */}
            <path
                d="M2.7,16.41v-3.66h16.74c1.02,0,1.85.83,1.85,1.85v1.81"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.7"
            />
            {/* active tab */}
            <path
                d="M5.18,7.59h4.16c1.37,0,2.47,1.11,2.47,2.47v2.69H2.7v-2.69c0-1.37,1.11-2.47,2.47-2.47Z"
                fill="currentColor"
                //opacity="0.12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
            {/* inactive tab */}
            <path
                d="M9.16,7.59h4.16c1.37,0,2.47,1.11,2.47,2.47v2.69H6.69v-2.69c0-1.37,1.11-2.47,2.47-2.47Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.7"
            />
        </symbol>
    );
}

export function SymbolControlTab({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-tab" />
        </svg>
    );
}

