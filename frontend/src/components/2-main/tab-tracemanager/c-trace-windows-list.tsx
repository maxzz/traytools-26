import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { Eraser, Play, Square } from "lucide-react";
import { traceManagerStore, traceManagerActions } from "@/store/3-trace-manager";
import { selectedProcessIdAtom } from "./a-trace-manager-atoms";
import { useAtom } from "jotai";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { cn } from "@/utils";

// Top pane of the Trace Manager: the list of per-process trace windows with a
// show/hide checkbox each (the legacy manager_listview_t with LVS_EX_CHECKBOXES),
// plus the stream start/stop and clear controls. Selecting a row shows that
// process's trace lines in the bottom pane.
export function TraceWindowsList() {
    const snap = useSnapshot(traceManagerStore);
    const [selectedId, setSelectedId] = useAtom(selectedProcessIdAtom);

    const processes = Object.values(snap.processes).sort((a, b) => a.processName.localeCompare(b.processName));

    // Keep the selection valid as processes come and go.
    useEffect(() => {
        if (selectedId == null) return;
        if (!traceManagerStore.processes[selectedId]) {
            setSelectedId(processes[0]?.processId ?? null);
        }
    }, [processes, selectedId, setSelectedId]);

    return (
        <div className="flex flex-col min-h-0 h-full">
            <Toolbar />

            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                <span>Process</span>
                <span className="text-right">Lines</span>
                <span className="text-center">Show</span>
            </div>

            <ScrollArea className="flex-1 min-h-0" fullHeight>
                {processes.length === 0 ? (
                    <EmptyState streaming={snap.streaming} />
                ) : (
                    <ul className="divide-y">
                        {processes.map((p) => (
                            <ProcessRow
                                key={p.processId}
                                processId={p.processId}
                                processName={p.processName}
                                lineCount={p.calls.length}
                                visible={p.visible}
                                selected={selectedId === p.processId}
                                onSelect={() => setSelectedId(p.processId)}
                                onToggleVisible={(v) => traceManagerActions.setWindowVisible(p.processId, v)}
                            />
                        ))}
                    </ul>
                )}
            </ScrollArea>
        </div>
    );
}

function Toolbar() {
    const snap = useSnapshot(traceManagerStore);
    const streaming = snap.streaming;
    const hasProcesses = Object.keys(snap.processes).length > 0;

    return (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-muted/20">
            <Button
                size="xs"
                variant={streaming ? "secondary" : "default"}
                onClick={() => (streaming ? traceManagerActions.stopStream() : traceManagerActions.startStream())}
            >
                {streaming ? <Square className="size-3" /> : <Play className="size-3" />}
                {streaming ? "Stop" : "Start"}
            </Button>
            <Button
                size="xs"
                variant="outline"
                disabled={!hasProcesses}
                onClick={() => traceManagerActions.clearAll()}
            >
                <Eraser className="size-3" />
                Clear
            </Button>
            <span className="ml-auto text-[0.65rem] font-mono text-muted-foreground">
                {streaming ? "streaming…" : "idle"}
            </span>
        </div>
    );
}

function ProcessRow({
    processId,
    processName,
    lineCount,
    visible,
    selected,
    onSelect,
    onToggleVisible,
}: {
    processId: number;
    processName: string;
    lineCount: number;
    visible: boolean;
    selected: boolean;
    onSelect: () => void;
    onToggleVisible: (v: boolean) => void;
}) {
    return (
        <li
            onClick={onSelect}
            className={cn(
                "grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1.5 text-xs cursor-pointer items-center",
                "hover:bg-muted/40",
                selected && "bg-muted/60"
            )}
        >
            <div className="flex flex-col min-w-0">
                <span className="truncate">{processName || "(unknown)"}</span>
                <span className="font-mono text-[0.6rem] text-muted-foreground">
                    0x{processId.toString(16).toUpperCase().padStart(8, "0")}
                </span>
            </div>
            <span className="font-mono text-[0.65rem] text-muted-foreground text-right tabular-nums">{lineCount}</span>
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={visible} onCheckedChange={(v) => onToggleVisible(v === true)} />
            </div>
        </li>
    );
}

function EmptyState({ streaming }: { streaming: boolean }) {
    return (
        <div className="p-6 text-center text-xs text-muted-foreground">
            {streaming
                ? "Waiting for trace calls…"
                : "No trace windows yet. Press Start to begin streaming trace calls."}
        </div>
    );
}
