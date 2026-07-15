import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appBus } from "@/bridge";
import { appSettings } from "@/store/1-ui-settings";
import { notice } from "@/ui/local-ui/7-toaster";
import { Button } from "@/ui/shadcn/button";
import { classNames } from "@/utils";
import { IconDpAgentStatus } from "./1-icon-status";
import { IntegrityBadge } from "./2-integrity-badge";
import {
    dpAgentBusyAtom,
    dpAgentStatusAtom,
    pollDpAgentStatusAtom,
    startDpAgentAtom,
    stopDpAgentAtom,
} from "./a-dpagent-atoms";

const POLL_MS = 1000;

/**
 * DPAgent toolbar: status icon, Start/Stop, integrity glyphs, Exit.
 * Mounted only while `appSettings.showDpAgentToolbar` is true; that same flag
 * gates the 1s run monitor (legacy main.dpagenttoolbar).
 */
export function DpAgentToolbar({ className }: { className?: string; }) {
    const settings = useSnapshot(appSettings);
    const status = useAtomValue(dpAgentStatusAtom);
    const busy = useAtomValue(dpAgentBusyAtom);
    const poll = useSetAtom(pollDpAgentStatusAtom);
    const startAgent = useSetAtom(startDpAgentAtom);
    const stopAgent = useSetAtom(stopDpAgentAtom);

    const running = status?.running ?? false;

    useEffect(
        () => {
            void poll();
            const id = window.setInterval(() => { void poll(); }, POLL_MS);
            return () => window.clearInterval(id);
        },
        [poll],
    );

    async function onStart() {
        try {
            await startAgent(settings.startDpAgentHigh);
        } catch (e) {
            notice.error(`DPAgent start failed:\n ${String(e)}`);
        }
    }

    async function onStop() {
        try {
            await stopAgent();
        } catch (e) {
            notice.error(`DPAgent stop failed:\n ${String(e)}`);
        }
    }

    return (
        <div
            className={classNames("h-6 px-1 gap-1 rounded-sm border border-border bg-muted/30 inline-flex items-center", className)}
            title={status?.agentPath ? `DPAgent: ${status.agentPath}` : "DPAgent toolbar"}
        >
            <IconDpAgentStatus running={running} title={running ? "DPAgent is running" : "DPAgent is not running"} />

            <Button
                type="button"
                variant="outline"
                size="xs"
                className="h-5 px-1.5"
                disabled={busy || running}
                onClick={() => { void onStart(); }}
                title={settings.startDpAgentHigh ? "Start DPAgent elevated" : "Start DPAgent"}
            >
                Start
            </Button>

            <Button
                type="button"
                variant="outline"
                size="xs"
                className="h-5 px-1.5"
                disabled={busy || !running}
                onClick={() => { void onStop(); }}
                title="Stop DPAgent and unload hooks"
            >
                Stop
            </Button>

            <IntegrityBadge level={status?.agentIntegrity} subject="DPAgent" />

            <span className="mx-0.5 w-px h-3.5 bg-border" aria-hidden />

            <Button
                type="button"
                variant="outline"
                size="xs"
                className="h-5 px-1.5"
                onClick={() => appBus.exit().catch(console.error)}
                title="Exit application"
            >
                Exit
            </Button>

            <IntegrityBadge level={status?.selfIntegrity} subject="Traytools" />
        </div>
    );
}
