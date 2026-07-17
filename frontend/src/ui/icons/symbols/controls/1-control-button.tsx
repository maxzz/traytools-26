import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolControlButton() {
    return (
        <symbol id="control-button" viewBox="0 0 24 24">
            {/* shadow */}
            <path
                d="M21.23,10.2v4.61c0,1.59-1.18,2.88-2.63,2.88H6.43"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                opacity="0.35"
            />
            {/* body */}
            <rect
                x="2.77"
                y="6.31"
                width="17.43"
                height="10.37"
                rx="2.63"
                ry="2.63"
                fill="currentColor"
                opacity="0.12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
            />
            {/* text btn */}
            <g className="fill-current stroke-none">
                <path d="M6.93,8.92c.27-.06.7-.11,1.13-.11.62,0,1.02.12,1.32.38.25.2.4.51.4.93,0,.51-.31.95-.81,1.15v.02c.46.12.99.54.99,1.32,0,.45-.16.8-.41,1.05-.33.34-.87.49-1.66.49-.43,0-.75-.03-.96-.06v-5.17ZM7.55,11.07h.56c.65,0,1.04-.37,1.04-.88,0-.62-.43-.86-1.05-.86-.28,0-.45.02-.55.05v1.69ZM7.55,13.59c.12.02.3.03.52.03.64,0,1.23-.26,1.23-1.02,0-.72-.56-1.01-1.24-1.01h-.51v2Z" />
                <path d="M11.51,9.24v1.08h.9v.52h-.9v2.04c0,.47.12.73.47.73.16,0,.28-.02.36-.05l.03.51c-.12.05-.31.09-.55.09-.29,0-.53-.1-.68-.29-.18-.2-.24-.54-.24-.98v-2.06h-.53v-.52h.53v-.9l.61-.18Z" />
                <path d="M13.11,11.35c0-.39,0-.71-.03-1.02h.55l.04.62h.01c.17-.36.57-.71,1.14-.71.48,0,1.22.31,1.22,1.61v2.25h-.63v-2.18c0-.61-.21-1.12-.8-1.12-.41,0-.73.32-.84.7-.03.09-.04.2-.04.32v2.27h-.63v-2.75Z" />
            </g>
        </symbol>
    );
}

export function SymbolControlButton({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-button" />
        </svg>
    );
}

