import { Button } from "@/ui/shadcn/button";
import { appSettings } from "@/store/1-ui-settings";

export function ButtonHome() {
    return (
        <Button
            className="h-6 px-2 rounded text-xs"
            variant="ghost"
            size="sm"
            onClick={() => { appSettings.mainTab = "welcome"; }}
            title="Home"
            type="button"
        >
            Home
        </Button>
    );
}
