import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolControlThumb() {
    return (
        <symbol id="control-thumb" viewBox="0 0 24 24">
            <rect
                x="2.48"
                y="7.42"
                width="19.04"
                height="9.16"
                rx="1.62"
                ry="1.62"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.8"
            />
            <path
                d="M4.4,12.48l2.56,1.48c.37.21.83-.05.83-.48v-2.95c0-.43-.46-.69-.83-.48l-2.56,1.48c-.37.21-.37.75,0,.96Z"
                fill="currentColor"
            />
            <path
                d="M19.48,11.52l-2.56-1.48c-.37-.21-.83.05-.83.48v2.95c0,.43.46.69.83.48l2.56-1.48c.37-.21.37-.75,0-.96Z"
                fill="currentColor"
            />
            <line
                x1="9.6"
                y1="7.42"
                x2="9.6"
                y2="16.58"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.55"
            />
            <line
                x1="14.33"
                y1="7.42"
                x2="14.33"
                y2="16.58"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.55"
            />
            <rect x="10.63" y="11" width="2.68" height="2.74" rx=".69" ry=".69" fill="currentColor" opacity="0.5" />
        </symbol>
    );
}

export function SymbolControlThumb({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-thumb" />
        </svg>
    );
}

