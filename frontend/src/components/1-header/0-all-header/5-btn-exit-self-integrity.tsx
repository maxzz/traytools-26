import { useAtomValue, useSetAtom } from "jotai";
import { appBus, type IntegrityLevel } from "@/bridge";
import { Button } from "@/ui/shadcn/button";
import { IntegrityBadge } from "../4-dpagent-toolbar/2-integrity-badge";
import { appIsElevatedAtom, settingsQuitOnCloseAtom, settingsRunElevatedAtom } from "../../4-dialogs/8-3-settings/a-settings-atoms";

export function ButtonExit() {
    const quitOnClose = useAtomValue(settingsQuitOnCloseAtom);
    return (<>
        {!quitOnClose && (
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
    const setRunElevated = useSetAtom(settingsRunElevatedAtom);
    const level: IntegrityLevel | undefined =
        isElevated === null ? undefined : isElevated ? "high" : "medium";
    const title = isElevated
        ? "Running elevated — click to restart as normal"
        : "Running normal — click to restart elevated";

    return (
        <button
            type="button"
            className="focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 outline-hidden rounded-full"
            disabled={isElevated === null}
            onClick={() => {
                if (isElevated === null) {
                    return;
                }
                setRunElevated(!isElevated);
            }}
            title={title}
            aria-label={title}
        >
            <IntegrityBadge level={level} subject="Traytools" className="cursor-pointer" title={title} />
        </button>
    );
}
