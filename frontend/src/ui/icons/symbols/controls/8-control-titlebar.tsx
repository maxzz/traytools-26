import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolControlTitlebar() {
    return (
        <symbol id="control-titlebar" viewBox="0 0 24 24">
            {/* window edge */}
            <line
                x1="2.37"
                y1="18.6"
                x2="2.37"
                y2="14.23"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
            {/* line inside top left button */}
            <line
                x1="4.93"
                y1="9.83"
                x2="7.69"
                y2="9.83"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeMiterlimit="10"
            />
            {/* frame around top left button */}
            <path
                d="M3.69,5.4h6.82v8.87H2.37v-7.55c0-.73.59-1.33,1.33-1.33Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.85"
            />
            {/* title background */}
            <rect
                x="10.52"
                y="5.4"
                width="11.11"
                height="8.87"
                fill="currentColor"
                opacity="0.12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
            {/* title border */}
            <rect
                x="10.52"
                y="5.4"
                width="11.11"
                height="8.87"
                fill="none"
                //opacity="0.12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
        </symbol>
    );
}

export function SymbolControlTitlebar({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-titlebar" />
        </svg>
    );
}

