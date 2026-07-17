import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolControlScrollbar() {
    return (
        <symbol id="control-scrollbar" viewBox="0 0 24 24">
            <rect
                x="2.39"
                y="7.38"
                width="19.21"
                height="9.24"
                rx="1.62"
                ry="1.62"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />

            <path
                d="M4.33,12.48l2.59,1.5c.37.21.83-.05.83-.48v-3c0-.43-.46-.69-.83-.48l-2.59,1.5c-.37.21-.37.75,0,.96Z"
                fill="currentColor"
            />
            <path
                d="M19.55,11.52l-2.59-1.5c-.37-.21-.83.05-.83.48v3c0,.43.46.69.83.48l2.59-1.5c.37-.21.37-.75,0-.96Z"
                fill="currentColor"
            />

            <line
                x1="9.58"
                y1="7.38"
                x2="9.58"
                y2="16.62"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.6"
            />
            <line
                x1="14.35"
                y1="7.38"
                x2="14.35"
                y2="16.62"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.6"
            />
        </symbol>
    );
}

export function SymbolControlScrollbar({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-scrollbar" />
        </svg>
    );
}

