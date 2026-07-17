import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolControlWindow() {
    return (
        <symbol id="control-window" viewBox="0 0 24 24">
            {/* frame */}
            <path
                d="M21.8,4.23c-.85-1.45-6.51-1.65-9.8-1.65s-8.95.18-9.8,1.65c-.85.72-.94,4.57-.94,7.77s.08,7.04.94,7.77c.85,1.45,6.51,1.65,9.8,1.65s8.95-.18,9.8-1.65c.85-.72.94-4.57.94-7.77s-.08-7.04-.94-7.77Z"
                fill="#48eeff"
                //opacity="0.10"
                stroke="#231f20"
                strokeWidth=".6"
                strokeMiterlimit="6"
            />
            {/* screen */}
            <path
                d="M19.35,8.82c-.64-.84-4.88-.85-7.35-.85s-6.71,0-7.35.85c-.64.42-.7,2.66-.7,4.52s.06,4.1.7,4.52c.64.84,4.88.85,7.35.85s6.71,0,7.35-.85c.64-.42.7-2.67.7-4.52s-.06-4.1-.7-4.52ZM3.94,5.62c0,.56.45,1.01,1.01,1.01s1.01-.45,1.01-1.01h0c0-.56-.45-1.01-1.01-1.01-.56,0-1.01.45-1.01,1.01ZM7.3,5.62c0,.56.45,1.01,1.01,1.01s1.01-.45,1.01-1.01h0c0-.56-.45-1.01-1.01-1.01-.56,0-1.01.45-1.01,1.01Z"
                fill="white"
                //opacity="0.04"
                stroke="#231f20"
                strokeWidth=".6"
                strokeMiterlimit="6"
            />
            {/* highlight */}
            <path
                d="M19.36,4.54c1.45.34,1.45.58,1.58,1.4"
                fill="none"
                stroke="white"
                strokeWidth=".6"
                strokeMiterlimit="6"
                strokeLinecap="round"
                //opacity="0.35"
            />
        </symbol>
    );
}

export function SymbolControlWindow({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-window" />
        </svg>
    );
}

