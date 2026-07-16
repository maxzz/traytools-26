import { useAtomValue } from "jotai";
import { appBus } from "@/bridge";
import { Button } from "@/ui/shadcn/button";
import { IntegrityBadge } from "../4-dpagent-toolbar/2-integrity-badge";
import { dpAgentStatusAtom } from "../4-dpagent-toolbar/a-dpagent-atoms";
import { settingsQuitOnCloseAtom } from "../../4-dialogs/8-3-settings/a-settings-atoms";

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

export function BadgeSelfIntegrity() {
    const status = useAtomValue(dpAgentStatusAtom);
    return (
        <IntegrityBadge level={status?.selfIntegrity} subject="Traytools" />
    );
}
