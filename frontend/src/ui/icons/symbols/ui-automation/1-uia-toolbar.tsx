import { type HTMLAttributes, type SVGAttributes } from "react"; //https://www.svgrepo.com/svg/333425/toolbar-top
import { classNames } from "@/utils";

export function SvgSymbol_uia_Toolbar() {
    return (
        <symbol id="uia-toolbar" viewBox="0 0 24 24">
            <path d="M18 11H6V9H18V11Z" />
            <path fillRule="evenodd" clipRule="evenodd" d="M2 16C2 17.6569 3.34315 19 5 19H19C20.6569 19 22 17.6569 22 16V8C22 6.34315 20.6569 5 19 5H5C3.34315 5 2 6.34315 2 8V16ZM5 17H19C19.5523 17 20 16.5523 20 16V8C20 7.44772 19.5523 7 19 7H5C4.44772 7 4 7.44771 4 8V16C4 16.5523 4.44772 17 5 17Z" />
        </symbol>
    );
}

export function Symbol_uia_Toolbar({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-current stroke-none", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#uia-toolbar" />
        </svg>
    );
}
