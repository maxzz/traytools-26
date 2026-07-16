import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils/classnames";

export type EarthFills = {
    ocean: string;
    land: string;
};

export const earthFills: EarthFills = { ocean: "#80d6fa", land: "#50dd8e" };
const earthFillsNone: EarthFills = { ocean: "none", land: "none" };

export function IconEarth({ className, title, earthFills, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement> & { earthFills?: EarthFills; }) {
    earthFills = earthFills || earthFillsNone;

    return (
        <svg className={classNames("stroke-current stroke-[1.5px]", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            {/* <path fill="#074882" d="M0 0h24v24H0z" /> */}
            <circle fill={earthFills.ocean} cx="12" cy="12" r="10.9" />
            <path fill={earthFills.land} d="M12 22.7c-1.4 0-2.6-.4-2.6-.4C4.7 21.2 1.3 17 1.3 12v-1.2c1.4-.1 3 .1 2.5.7-.7.7-.3 3.6 1.2 2.5 1.4-1 2.1-2.5 1.8-3.6s2.5-1.5 2.5.3-.7 1.5-1 2.6c-.4 1 .3 1 .7 1.5.4.3 1.5 1 .4 3.6-.9 2 1 3.4 2.5 4.3m7.4-9.9c.8.8-.7 1.1-1.1 2.3-.4 1-1.9 1-2.3.7l-1.8-1.1c-.8-.4 0-1.1.7-.8.8.4 1-1 1.9-1 .4 0 1.9-.8 2.6 0Zm-7 6c.4.4.8 1.2.4 1.6q-.7.4-1.5 0c-.5-.5.7-1.9 1.1-1.5m10-9.6c-1.4.6-3.6.9-4 .6-.8-.4-.8-2.2-2.1-2.3-.6 0-1.2 2.2-1.9 2.6S13.3 9 12.5 8s1.2-2.2 2-2.2.7-2 .7-2.3-.8-.8-.5-1.8L16 2c3 1.3 5.4 4 6.3 7.2" />
        </svg>
    );
}
