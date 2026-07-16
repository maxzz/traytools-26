import { useAtomValue } from "jotai";
import { appBus } from "@/bridge";
import { Button } from "@/ui/shadcn/button";
import { IntegrityBadge } from "./4-dpagent-toolbar/2-integrity-badge";
import { dpAgentStatusAtom } from "./4-dpagent-toolbar/a-dpagent-atoms";
import { settingsQuitOnCloseAtom } from "../4-dialogs/8-3-settings/a-settings-atoms";

/** Exit control plus Traytools self-integrity badge. */
export function ExitSelfIntegrity() {
    const status = useAtomValue(dpAgentStatusAtom);
    const quitOnClose = useAtomValue(settingsQuitOnCloseAtom);

    return (
        <>
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

            <IntegrityBadge level={status?.selfIntegrity} subject="Traytools" />
        </>
    );
}
