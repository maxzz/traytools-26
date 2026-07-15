import { type SVGProps } from "react";
import { IconDpSensorGray, IconDpSensorGreen } from "@/ui/icons/normal";
import { classNames } from "@/utils";

/** Status glyph: green sensor when running, gray when stopped. */
export function IconDpAgentStatus({ running, className, title, ...rest }: SVGProps<SVGSVGElement> & { running: boolean; title: string; }) {
    const Icon = running ? IconDpSensorGreen : IconDpSensorGray;
    return (
        <Icon
            className={classNames("shrink-0 size-4", className)}
            title={title}
            aria-hidden
            {...rest}
        />
    );
}
