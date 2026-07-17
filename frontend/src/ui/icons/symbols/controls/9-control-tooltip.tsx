import { type HTMLAttributes, type SVGAttributes } from "react";
import { classNames } from "@/utils";

export function SvgSymbolControlTooltip() {
    return (
        <symbol id="control-tooltip" viewBox="0 0 24 24">
            <path
                d="M10,18c0,1.1.9,2,2,2s2-.9,2-2-.9-2-2-2-2,.9-2,2"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
            />
            <path
                d="M12,13l-1.71-1.71c-.19-.19-.44-.29-.71-.29h-2.59c-1.1,0-2-.9-2-2v-3c0-1.1.9-2,2-2h10c1.1,0,2,.9,2,2v3c0,1.1-.9,2-2,2h-2.59c-.27,0-.52.11-.71.29l-1.71,1.71"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
            />
        </symbol>
    );
}

export function SymbolControlTooltip({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-tooltip" />
        </svg>
    );
}

