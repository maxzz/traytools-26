import { useAtomValue } from "jotai";
import { appBus } from "@/bridge";
import { settingsQuitOnCloseAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { Button } from "@/ui/shadcn/button";

export function ButtonExit() {
    const quitOnClose = useAtomValue(settingsQuitOnCloseAtom);

    if (quitOnClose) {
        return null;
    }

    return (
        <Button
            className="ml-4 px-2 h-6 text-xs"
            variant="outline"
            size="sm"
            onClick={() => appBus.exit().catch(console.error)}
            title="Exit application"
            type="button"
        >
            Exit
        </Button>
    );
}
