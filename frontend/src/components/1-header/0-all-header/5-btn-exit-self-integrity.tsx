import { useAtomValue } from "jotai";
import { appBus, type IntegrityLevel } from "@/bridge";
import { Button } from "@/ui/shadcn/button";
import { IntegrityBadge } from "../4-dpagent-toolbar/2-integrity-badge";
import { appIsElevatedAtom, settingsQuitOnCloseAtom } from "../../4-dialogs/8-3-settings/a-settings-atoms";

export function ButtonExit() {
    const quitOnClose = useAtomValue(settingsQuitOnCloseAtom);
    return (<>
        {quitOnClose && (
            <Button
                type="button"
                variant="outline"
                size="xs"
                className="px-2 h-6 rounded"
                onClick={() => appBus.exit().catch(console.error)}
                title="Exit application"
            >
                Exit
            </Button>
        )}
    </>);
}

/** TrayTools elevation badge — uses startup-synced app elevation, not DpAgent poll. */
export function BadgeSelfIntegrity() {
    const isElevated = useAtomValue(appIsElevatedAtom);
    const level: IntegrityLevel | undefined =
        isElevated === null ? undefined : isElevated ? "high" : "medium";
    return (
        <IntegrityBadge level={level} subject="Traytools" />
    );
}
