import { type HTMLAttributes, type SVGAttributes } from "react"; // https://icon-sets.iconify.design/?query=tree&search-page=3 ph:tree-view-thin
import { classNames } from "@/utils";

export function SvgSymbolControlTreeRoot() {
    return (
        <symbol id="control-tree-root" viewBox="0 0 24 24" className="fill-none stroke-[1.3]">
            <path className="stroke-current/50" d="M14.15,19.61h-5.98c-.78,0-1.41-.68-1.41-1.51V7.62" /> {/* to-chilld2 */}
            <line className="stroke-current/50" x1="7.25" y1="11.25" x2="14.15" y2="11.25" /> {/* to-child1 */}
            <rect className="stroke-current/50" x="14.62" y="16.87" width="5.25" height="5.25" rx="1.11" ry="1.11" /> {/* child2 */}
            <rect className="stroke-current/50" x="14.62" y="8.63" width="5.25" height="5.25" rx="1.11" ry="1.11" /> {/* child1 */}
            <rect className="fill-sky-300" x="4.12" y="1.88" width="5.25" height="5.25" rx="1.11" ry="1.11" /> {/* root */}
        </symbol>
    );
}

export function SymbolControlTreeRoot({ className, title, children, ...rest }: SVGAttributes<SVGSVGElement> & HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} {...rest}>
            {title && <title>{title}</title>}
            {children}
            <use xlinkHref="#control-tree-root" />
        </svg>
    );
}
