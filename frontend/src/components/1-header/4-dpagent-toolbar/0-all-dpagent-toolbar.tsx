import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { appSettings } from "@/store/1-ui-settings";
import { notice } from "@/ui/local-ui/7-toaster";
import { Button } from "@/ui/shadcn/button";
import { classNames } from "@/utils";
import { IconDpAgentStatus } from "./1-icon-status";
import { IntegrityBadge } from "./2-integrity-badge";
import { dpAgentBusyAtom, dpAgentStatusAtom, pollDpAgentStatusAtom, startDpAgentAtom, stopDpAgentAtom, } from "./a-dpagent-atoms";

const POLL_MS = 1000;

/**
 * DPAgent toolbar: status icon toggle, Start/Stop, integrity glyphs.
 * `appSettings.showDpAgentToolbar` expands controls and gates the 1s run monitor.
 */
export function DpAgentToolbar({ className }: { className?: string; }) {
    const settings = useSnapshot(appSettings);
    const status = useAtomValue(dpAgentStatusAtom);
    const busy = useAtomValue(dpAgentBusyAtom);
    const poll = useSetAtom(pollDpAgentStatusAtom);
    const startAgent = useSetAtom(startDpAgentAtom);
    const stopAgent = useSetAtom(stopDpAgentAtom);

    const running = status?.running ?? false;
    const controlsVisible = settings.showDpAgentToolbar;

    useEffect(
        () => {
            if (!controlsVisible) {
                return;
            }
            poll();
            const id = window.setInterval(() => { poll(); }, POLL_MS);
            return () => window.clearInterval(id);
        },
        [controlsVisible, poll]);

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

    const statusTitle = running ? "DPAgent is running" : "DPAgent not started";
    const toggleTitle = controlsVisible
        ? `Hide controls — ${statusTitle}`
        : `Show controls — ${statusTitle}`;

    return (
        <div
            className={classNames("px-1 h-6 bg-muted/30 border border-border rounded inline-flex items-center gap-px", className)}
            title={status?.agentPath ? `DPAgent: ${status.agentPath}` : "DPAgent toolbar"}
        >
            <button
                type="button"
                className="shrink-0 rounded outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => { appSettings.showDpAgentToolbar = !appSettings.showDpAgentToolbar; }}
                title={toggleTitle}
                aria-label={toggleTitle}
                aria-expanded={controlsVisible}
            >
                <IconDpAgentStatus
                    running={running}
                    title={statusTitle}
                    className={controlsVisible ? undefined : "grayscale opacity-50"}
                />
            </button>

            <AnimatePresence initial={false}>
                {controlsVisible && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto", transition: { duration: 0.2, ease: "easeIn" } }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden inline-flex items-center gap-px"
                    >
                        <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="px-1.5 h-5 rounded"
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
                            className="px-1.5 h-5 rounded"
                            disabled={busy || !running}
                            onClick={() => { void onStop(); }}
                            title="Stop DPAgent and unload hooks"
                        >
                            Stop
                        </Button>

                        <IntegrityBadge className="ml-0.5" level={status?.agentIntegrity} subject="DPAgent" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
