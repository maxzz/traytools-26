import { useEffect, useState } from "react";
import { classNames } from "@/utils";
import { settingsBus } from "@/bridge/groups/settings";
import { IconRadix_DotFilled } from "@/ui/icons/normal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";

export function ElevatedIndicator() {
    const [isElevated, setIsElevated] = useState<boolean | null>(null);

    useEffect(
        () => {
            settingsBus.isElevated().then(setIsElevated).catch(console.error);
        },
        [],
    );

    if (isElevated === null) {
        return null;
    }

    const label = isElevated ? "Elevated" : "Standard";
    const ariaLabel = isElevated ? "Running elevated" : "Running with standard privileges";
    const tooltipContent = isElevated ? "Running as administrator" : "Running with standard privileges";

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground rounded select-none cursor-default inline-flex items-center" aria-label={ariaLabel}>
                        <IconRadix_DotFilled className={classNames("size-3 scale-200", isElevated ? "text-red-500" : "text-muted-foreground/60")}/>
                        {label}
                    </span>
                </TooltipTrigger>

                <TooltipContent side="bottom">
                    {tooltipContent}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
