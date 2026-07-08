import { type HTMLAttributes } from "react"; //https://icones.js.org/collection/all?s=terminal&icon=material-symbols-light:terminal //Icon from Material Symbols Light by Google - https://github.com/google/material-design-icons/blob/master/LICENSE
import { classNames } from "@/utils";

export function IconTerminal({ className, title, ...rest }: HTMLAttributes<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-current stroke-none", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M4.62 19q-.7 0-1.16-.46T3 17.38V6.62q0-.7.46-1.16T4.62 5h14.77q.68 0 1.15.46T21 6.62v10.77q0 .68-.46 1.15t-1.15.46zm0-1h14.77q.22 0 .42-.2t.19-.42V8H4v9.39q0 .22.2.42t.42.19m2.88-1.71-.69-.69L9.4 13l-2.6-2.6.71-.69L10.8 13zm5 .21v-1h5v1z" />
        </svg>
    );
}
