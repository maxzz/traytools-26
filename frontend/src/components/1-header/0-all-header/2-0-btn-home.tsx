import { Button } from "@/ui/shadcn/button";
import { appSettings } from "@/store/1-ui-settings";
import { IconHome } from "@/ui/icons/normal";
import { useSnapshot } from "valtio";
import { pulseWelcomeLogo } from "@/components/2-main/8-tab-welcome/s-logo-pulse";

export function ButtonHome() {
    const { mainTab } = useSnapshot(appSettings);
    const isWelcomePage = mainTab === "welcome";

    return (
        <Button
            className="size-6 px-2 rounded text-xs text-foreground/75"
            variant="ghost"
            size="sm"
            onClick={() => {
                if (isWelcomePage) {
                    pulseWelcomeLogo();
                    return;
                }
                appSettings.mainTab = "welcome";
            }}
            title="Home"
            type="button"
        >
            <IconHome className="size-4 stroke-1!" />
        </Button>
    );
}
