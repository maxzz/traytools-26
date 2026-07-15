import { type SVGProps } from "react";
import { classNames } from "@/utils";

/** Status glyph matching legacy DpAgentOn / DpAgentOff toolbar icons. */
export function IconDpAgentStatus({ running, className, title, ...rest }: SVGProps<SVGSVGElement> & { running: boolean; title: string; }) {
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={classNames("shrink-0 size-4", className)}
            aria-hidden
            {...rest}
        >
            <title>{title}</title>
            <circle cx="8" cy="8" r="6.5" fill={running ? "#4ade80" : "#9ca3af"} stroke={running ? "#16a34a" : "#6b7280"} strokeWidth="1" />
            {!running && (
                <circle cx="12" cy="12" r="3.25" fill="#ef4444" stroke="#fff" strokeWidth="1" />
            )}
            {!running && (
                <path d="M10.7 10.7l2.6 2.6M13.3 10.7l-2.6 2.6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
            )}
            {running && (
                <path d="M5.5 8.2l1.8 1.8 3.4-3.6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            )}
        </svg>
    );
}
