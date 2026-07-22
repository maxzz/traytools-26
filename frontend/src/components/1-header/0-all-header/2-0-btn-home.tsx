import { Button } from "@/ui/shadcn/button";
import { appSettings } from "@/store/1-ui-settings";
import { IconHome } from "@/ui/icons/normal";
import { useSnapshot } from "valtio";

export function ButtonHome() {
    const { mainTab } = useSnapshot(appSettings);
    const isWelcomePage = mainTab === "welcome";
    if (isWelcomePage) {
        return null;
    }

    return (
        <Button
            className="size-6 px-2 rounded text-xs text-foreground/75"
            variant="ghost"
            size="sm"
            onClick={() => { appSettings.mainTab = "welcome"; }}
            title="Home"
            type="button"
        >
            <IconHome className="size-4 stroke-1!" />
        </Button>
    );
}
