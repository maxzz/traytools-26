import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { traceManagerStore } from "@/store/3-trace-manager";
import {
    autoScrollAtom,
    selectedProcessAtom,
    selectedProcessIdAtom,
    traceFilterAtom,
} from "./a-trace-manager-atoms";
import { parseTraceColor, traceColorHex } from "./b-trace-color";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { Input } from "@/ui/shadcn/input";
import { Eraser } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { cn } from "@/utils";

// Bottom pane of the Trace Manager: the trace lines for the selected process,
// equivalent to the legacy CTraceWindow's listview. Each line is
// "FunctionName(): text" with the legacy color marker applied.
export function TraceWindowView() {
    const [selected] = useAtom(selectedProcessAtom);
    const [filter, setFilter] = useAtom(traceFilterAtom);
    const [autoScroll, setAutoScroll] = useAtom(autoScrollAtom);
    const [selectedId] = useAtom(selectedProcessIdAtom);
    const viewportRef = useRef<HTMLDivElement | null>(null);

    // Re-render on trace-call mutations by snapshotting the whole store; Valtio
    // ensures only windows whose `calls` changed actually re-render.
    useSnapshot(traceManagerStore);

    const calls = selected?.calls ?? [];
    const filtered = filter
        ? calls.filter((c) =>
              `${c.functionName} ${c.text}`.toLowerCase().includes(filter.toLowerCase())
          )
        : calls;

    useEffect(() => {
        if (!autoScroll) return;
        const el = viewportRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [filtered.length, autoScroll]);

    if (!selected) {
        return (
            <div className="flex-1 min-h-0 grid place-items-center text-xs text-muted-foreground">
                Select a process to view its trace output.
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-0 h-full">
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-muted/20">
                <span className="text-xs font-medium truncate">{selected.processName}</span>
                <span className="font-mono text-[0.6rem] text-muted-foreground">
                    0x{selected.processId.toString(16).toUpperCase().padStart(8, "0")}
                </span>
                <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="filter…"
                    className="ml-auto h-6 w-36 text-xs"
                />
                <Button
                    size="icon-xs"
                    variant="outline"
                    title="Clear this window"
                    onClick={() => selectedId != null && traceManagerStore.processes[selectedId] && (traceManagerStore.processes[selectedId].calls.length = 0)}
                >
                    <Eraser className="size-3" />
                </Button>
                <label className="flex items-center gap-1 text-[0.65rem] text-muted-foreground select-none">
                    <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                        className="size-3"
                    />
                    auto
                </label>
            </div>

            <ScrollArea2
                ref={viewportRef}
                className="flex-1 min-h-0 font-mono text-[0.7rem] bg-muted/10"
                fullHeight
            >
                {filtered.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground">
                        {calls.length === 0 ? "No trace calls yet." : "No lines match the filter."}
                    </div>
                ) : (
                    <ul className="divide-y divide-border/40">
                        {filtered.map((call, i) => {
                            const parsed = parseTraceColor(call.text);
                            const color = traceColorHex(parsed.colorIndex);
                            return (
                                <li key={i} className="px-2 py-0.5 leading-tight break-all">
                                    <span className="text-muted-foreground">{call.functionName}()</span>
                                    <span className="text-muted-foreground">: </span>
                                    <span style={color ? { color } : undefined} className={cn(!color && "text-foreground")}>
                                        {parsed.text}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </ScrollArea2>
        </div>
    );
}
