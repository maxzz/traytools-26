import { useEffect, useState } from "react";
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

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className="px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground rounded inline-flex items-center gap-1 uppercase tracking-wide"
                        aria-label={isElevated ? "Running elevated" : "Running with standard privileges"}
                    >
                        <IconRadix_DotFilled className={isElevated ? "size-2 text-amber-500" : "size-2 text-muted-foreground/60"}/>
                        {label}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    {isElevated ? "Running as administrator" : "Running with standard privileges"}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
