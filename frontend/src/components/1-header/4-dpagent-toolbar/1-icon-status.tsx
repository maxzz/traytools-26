import { type SVGProps } from "react";
import { dpSensorColorsGray, dpSensorColorsGreen, IconDpSensor } from "@/ui/icons/normal";
import { classNames } from "@/utils";

/** Status glyph: green sensor when running, gray when stopped. */
export function IconDpAgentStatus({ running, className, title, ...rest }: SVGProps<SVGSVGElement> & { running: boolean; title: string; }) {
    return (
        <IconDpSensor
            {...(running ? dpSensorColorsGreen : dpSensorColorsGray)}
            className={classNames("shrink-0 size-4", className)}
            title={title}
            aria-hidden
            {...rest}
        />
    );
}
