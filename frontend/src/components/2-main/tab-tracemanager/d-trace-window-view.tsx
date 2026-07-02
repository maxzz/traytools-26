import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { cn } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { traceStore, clearWindow } from "@/store/3-trace-manager";
import { selectedProcessAtom, traceFilterAtom, autoScrollAtom, showColorsAtom } from "./a-trace-manager-atoms";
import { traceLineStyle } from "./b-trace-color";

// Bottom pane: the trace lines for the selected process, with color
// highlighting, a filter and auto-scroll. Port of the legacy CTraceWindow list.
export function TraceWindowView() {
    const snap = useSnapshot(traceStore);
    const [selected] = useAtom(selectedProcessAtom);
    const [filter, setFilter] = useAtom(traceFilterAtom);
    const [autoScroll, setAutoScroll] = useAtom(autoScrollAtom);
    const [showColors, setShowColors] = useAtom(showColorsAtom);

    const viewportRef = useRef<HTMLDivElement>(null);

    const win = selected != null ? snap.windows[selected] : undefined;

    const needle = filter.trim().toLowerCase();
    const calls = win
        ? (needle
            ? win.calls.filter((c) => c.text.toLowerCase().includes(needle) || c.function.toLowerCase().includes(needle))
            : win.calls)
        : [];

    // Auto-scroll to the newest line when enabled.
    useEffect(() => {
        if (autoScroll && viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
    }, [calls.length, autoScroll]);

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="px-2 py-1.5 border-b flex items-center gap-2">
                <span className="text-xs font-semibold truncate">
                    {win ? win.name : "Trace view"}
                </span>

                <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter…"
                    className="ml-auto h-6 w-40 text-xs"
                />
                <Button
                    size="xs"
                    variant={autoScroll ? "secondary" : "ghost"}
                    onClick={() => setAutoScroll(!autoScroll)}
                    title="Auto-scroll to newest line"
                >
                    Auto
                </Button>
                <Button
                    size="xs"
                    variant={showColors ? "secondary" : "ghost"}
                    onClick={() => setShowColors(!showColors)}
                    title="Toggle color highlighting"
                >
                    Color
                </Button>
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => selected != null && clearWindow(selected)}
                    disabled={!win || win.calls.length === 0}
                >
                    Clear
                </Button>
            </div>

            {!win
                ? <div className="p-3 text-xs text-muted-foreground">Select a process in the list above to view its trace.</div>
                : calls.length === 0
                    ? <div className="p-3 text-xs text-muted-foreground">{needle ? "No lines match the filter." : "No trace lines yet."}</div>
                    : (
                        <ScrollArea2 ref={viewportRef} className="flex-1 min-h-0" horizontal>
                            <div className="py-1 text-xs font-mono leading-relaxed">
                                {calls.map((c) => (
                                    <div key={c.seq} className={cn("px-2 hover:bg-muted/40 whitespace-pre")} style={traceLineStyle(c.colorIndex, showColors)}>
                                        <span className="text-muted-foreground">{c.function}(): </span>
                                        {c.text}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea2>
                    )}
        </div>
    );
}
