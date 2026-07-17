import { type HTMLAttributes, type SVGAttributes } from "react"; //https://www.svgrepo.com/svg/376709/tooltip-line
import { classNames } from "@/utils";

export function SvgSymbol_uia_Tooltip() {
    return (
        <symbol id="uia-tooltip" viewBox="0 0 24 24">
            <path d="M7 8H17M7 11H17M7 14H11" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M12.7071 20.2929L14.4142 18.5858C14.7893 18.2107 15.298 18 15.8284 18H19C20.1046 18 21 17.1046 21 16V6C21 4.89543 20.1046 4 19 4H5C3.89543 4 3 4.89543 3 6V16C3 17.1046 3.89543 18 5 18H8.17157C8.70201 18 9.21071 18.2107 9.58579 18.5858L11.2929 20.2929C11.6834 20.6834 12.3166 20.6834 12.7071 20.2929Z" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </symbol>
    );
}

export function Symbol_uia_Tooltip({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#uia-tooltip" />
        </svg>
    );
}
