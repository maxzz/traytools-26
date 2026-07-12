import { type ReactNode, useEffect } from "react";
import { Play, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
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

            <div className="flex-1 p-3 min-h-0 font-condensed text-xs bg-card border rounded-md overflow-auto">
                {error && (
                    <div className="mb-2 text-destructive">{error}</div>
                )}

                <TooltipProvider>
                    <div className="grid grid-cols-[auto_1fr] gap-y-1.5 divide-y divide-border/60">
                        {ROWS.map(
                            ({ key, label, tooltip }) => (
                                <WindowRow key={key} label={label} tooltip={tooltip} win={info?.[key]} />
                            )
                        )}

                        <WindowRow
                            label="Thread"
                            tooltip="The thread that owns the foreground window. Active, focus, and capture are read from this thread's input queue via AttachThreadInput."
                            contents={
                                info
                                    ? info.systemWide
                                        ? `System-wide (foreground thread 0x${threadHex(info.threadId)})`
                                        : `0x${threadHex(info.threadId)}`
                                    : "—"
                            }
                        />
                    </div>
                </TooltipProvider>
            </div>
        </div>
    );
}

function MonitorToolbar() {
    const [monitoring, setMonitoring] = useAtom(monitoringAtom);
    const pollActiveWindows = useSetAtom(pollActiveWindowsAtom);

    return (
        <div className="flex items-center gap-1">
            <Button className="font-normal font-condensed active:not-aria-[haspopup]:translate-y-0" variant={monitoring ? "outline" : "outline"} size="xs" type="button" onClick={() => setMonitoring((v) => !v)}>
                {monitoring ? <Square className="size-3 text-red-500" /> : <Play className="size-3 text-green-500" />}
                {monitoring ? "Stop monitoring" : "Start monitoring"}
            </Button>

            <AnimatePresence initial={false}>
                {!monitoring && (
                    <motion.div
                        className="overflow-hidden"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        <Button className="font-normal font-condensed active:not-aria-[haspopup]:translate-y-0" variant="outline" size="xs" type="button" onClick={() => void pollActiveWindows()}>
                            Refresh
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {monitoring && (<>
                <span className={"ml-2 size-2 bg-emerald-500 animate-pulse rounded-full"} aria-hidden />
                <span className="font-condensed text-[0.65rem] text-muted-foreground">watching local input state…</span>
            </>)}
        </div>
    );
}

function WindowRow({ label, tooltip, win, contents }: { label: string; tooltip: string; win?: MonitorWindow | undefined; contents?: ReactNode; }) {
    return (
        <div className="col-span-full grid grid-cols-subgrid gap-x-4 items-start">
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="pt-0.5 text-muted-foreground underline decoration-dotted underline-offset-2 cursor-help w-fit">
                        {label}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-72">
                    {tooltip}
                </TooltipContent>
            </Tooltip>
            <div className="min-w-0 truncate">
                {contents ?? <WindowText win={win} />}
            </div>
        </div>
    );
}

function WindowText({ win }: { win: MonitorWindow | undefined; }): ReactNode {
    if (!win) {
        return (
            <span className="text-muted-foreground/60">
                —
            </span>);
    }
    if (win.noWindow) {
        return (
            <span className="text-muted-foreground/60">
                <span className="font-mono">
                    {win.handle}
                </span> 
                {" "}(no window)
            </span>);
    }
    if (!win.valid) {
        return (
            <span className="text-amber-500">
                {win.handle} (invalid window)
            </span>);
    }
    return (<>
        <span className="font-mono text-sky-500">
            {win.handle}
        </span>
        {" "}
        <span className="text-foreground">
            {win.className || "(no class)"}
        </span>
        {" "}
        <span className="text-muted-foreground">
            {win.title ? `'${win.title}'` : "''"}
        </span>
    </>);
}

function threadHex(id: number): string {
    return (id >>> 0).toString(16).toUpperCase().padStart(4, "0");
}

const POLL_INTERVAL_MS = 500; // Matches the legacy liswatch TIMER_DELAY.

const ROWS: { key: keyof Pick<ActiveWindowsInfo, "foreground" | "active" | "focus" | "capture">; label: string; tooltip: string; }[] = [
    {
        key: "foreground",
        label: "Foreground",
        tooltip: "The top-level window that currently has system-wide keyboard focus (GetForegroundWindow).",
    },
    {
        key: "active",
        label: "Active",
        tooltip: "The active window in the foreground thread's input queue (GetActiveWindow). Read after temporarily attaching to that thread.",
    },
    {
        key: "focus",
        label: "Focus",
        tooltip: "The window that owns keyboard focus within the foreground thread's input queue (GetFocus).",
    },
    {
        key: "capture",
        label: "Capture",
        tooltip: "The window that has captured the mouse and receives all mouse input until capture is released (GetCapture).",
    },
];
