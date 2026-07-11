import { type ReactNode, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { type ActiveWindowsInfo, type MonitorWindow } from "@/bridge";
import { activeMonitorErrorAtom, activeWindowsInfoAtom, monitoringAtom, pollActiveWindowsAtom } from "./a-monitor-atoms";

/**
 * Active Monitor tab.
 * 
 * A port of the legacy liswatch_t "Watch Input" view: it polls the local input state
 * and shows which windows are currently the foreground / active / focus / capture windows,
 * foreground / active / focus / capture windows, plus the thread we attach to.
 * The backend (windowtree.getActiveWindows) does the AttachThreadInput dance so the
 * active/focus/capture values reflect the observed application, not us.
 */
export function Page_ActiveMonitor() {
    const monitoring = useAtomValue(monitoringAtom);
    const info = useAtomValue(activeWindowsInfoAtom);
    const error = useAtomValue(activeMonitorErrorAtom);
    const pollActiveWindows = useSetAtom(pollActiveWindowsAtom);

    useEffect(
        () => {
            if (!monitoring) {
                return;
            }
            void pollActiveWindows();
            const id = window.setInterval(() => void pollActiveWindows(), POLL_INTERVAL_MS);
            return () => window.clearInterval(id);
        },
        [monitoring, pollActiveWindows]);

    return (
        <div className="flex-1 p-2 min-h-0 min-w-0 flex flex-col gap-2">
            <MonitorToolbar />

            <div className="flex-1 p-3 min-h-0 text-xs bg-card border rounded-md overflow-auto">
                {error && (
                    <div className="mb-2 text-destructive">{error}</div>
                )}

                <div className="divide-y divide-border/60 flex flex-col">
                    {ROWS.map(
                        ({ key, label }) => (
                            <WindowRow key={key} label={label} win={info?.[key]} />
                        )
                    )}
                </div>

                <div className="mt-3 pt-2 border-t border-border/60 grid grid-cols-[6.5rem_1fr] gap-2 items-start">
                    <span className="text-muted-foreground">Thread</span>
                    <span className="font-mono break-all">
                        {info
                            ? info.systemWide
                                ? `System-wide (foreground thread 0x${threadHex(info.threadId)})`
                                : `0x${threadHex(info.threadId)}`
                            : "—"}
                    </span>
                </div>
            </div>
        </div>
    );
}

function MonitorToolbar() {
    const [monitoring, setMonitoring] = useAtom(monitoringAtom);
    const pollActiveWindows = useSetAtom(pollActiveWindowsAtom);

    return (
        <div className="flex items-center gap-2">
            <Button variant={monitoring ? "default" : "outline"} size="xs" type="button" onClick={() => setMonitoring((v) => !v)}>
                {monitoring ? "Stop monitoring" : "Start monitoring"}
            </Button>

            <Button variant="outline" size="xs" type="button" onClick={() => void pollActiveWindows()} disabled={monitoring}>
                Refresh
            </Button>

            <span className={classNames("size-2 rounded-full", monitoring ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} aria-hidden />
            <span className="text-muted-foreground">{monitoring ? "Watching local input state…" : "Paused"}</span>
        </div>
    );
}

function WindowRow({ label, win }: { label: string; win: MonitorWindow | undefined; }) {
    return (
        <div className="py-1 grid grid-cols-[6.5rem_1fr] gap-2 items-start">
            <span className="pt-0.5 text-muted-foreground">{label}</span>
            <div className="font-mono break-all">
                <WindowText win={win} />
            </div>
        </div>
    );
}

function WindowText({ win }: { win: MonitorWindow | undefined; }): ReactNode {
    if (!win) {
        return <span className="text-muted-foreground/60">—</span>;
    }
    if (win.noWindow) {
        return <span className="text-muted-foreground/60">{win.handle} (no window)</span>;
    }
    if (!win.valid) {
        return <span className="text-amber-500">{win.handle} (invalid window)</span>;
    }
    return (
        <span>
            <span className="text-sky-500">{win.handle}</span>{" "}
            <span className="text-foreground">{win.className || "(no class)"}</span>{" "}
            <span className="text-muted-foreground">
                {win.title ? `'${win.title}'` : "''"}
            </span>
        </span>
    );
}

function threadHex(id: number): string {
    return (id >>> 0).toString(16).toUpperCase().padStart(4, "0");
}

const POLL_INTERVAL_MS = 500; // Matches the legacy liswatch TIMER_DELAY.

const ROWS: { key: keyof Pick<ActiveWindowsInfo, "foreground" | "active" | "focus" | "capture">; label: string; }[] = [
    { key: "foreground", label: "Foreground" },
    { key: "active", label: "Active" },
    { key: "focus", label: "Focus" },
    { key: "capture", label: "Capture" },
];
