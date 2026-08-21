import { type SVGAttributes } from "react";
import { classNames } from "@/utils";

/** Target reticle matching the Spy++ finder: grey rings, red plus, NESW ticks. */
export function WindowPickerTargetIcon({ className, ...rest }: SVGAttributes<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className={classNames("size-4", className)}
            aria-hidden
            {...rest}
        >
            <circle cx="12" cy="12" r="8.15" className="stroke-neutral-400 dark:stroke-neutral-300" strokeWidth="1.15" />
            <circle cx="12" cy="12" r="5.15" className="stroke-neutral-400 dark:stroke-neutral-300" strokeWidth="1.15" />
            <path d="M12 9.55v4.9M9.55 12h4.9" className="stroke-red-500" strokeWidth="1.25" strokeLinecap="round" />
            <path d="M12 1.7v2.9M12 19.4v2.9M1.7 12h2.9M19.4 12h2.9" className="stroke-red-500" strokeWidth="1.45" strokeLinecap="round" />
        </svg>
    );
}
