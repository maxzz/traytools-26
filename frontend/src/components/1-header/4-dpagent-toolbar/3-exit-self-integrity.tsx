import { useAtomValue } from "jotai";
import { appBus } from "@/bridge";
import { Button } from "@/ui/shadcn/button";
import { IntegrityBadge } from "./2-integrity-badge";
import { dpAgentStatusAtom } from "./a-dpagent-atoms";

/** Exit control plus Traytools self-integrity badge. */
export function ExitSelfIntegrity() {
    const status = useAtomValue(dpAgentStatusAtom);

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="xs"
                className="px-1.5 h-5"
                onClick={() => appBus.exit().catch(console.error)}
                title="Exit application"
            >
                Exit
            </Button>

            <IntegrityBadge level={status?.selfIntegrity} subject="Traytools" />
        </>
    );
}
