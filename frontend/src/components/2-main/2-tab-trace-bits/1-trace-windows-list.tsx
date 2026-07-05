import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { motion } from "motion/react";
import { cn } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { IconChevronLeft } from "@/ui/icons/normal";
import { traceManagerBus } from "@/bridge";
import { traceStore, clearAllWindows, setStreaming, setWindowVisible } from "@/store/3-trace-manager";
import { selectedProcessAtom, showCategoriesAtom } from "./a-trace-manager-atoms";

// Top pane: the per-process window list with show/hide checkboxes and the
// stream controls. Port of the legacy manager_listview_t (LVS_EX_CHECKBOXES).
export function TraceWindowsList() {
    const snap = useSnapshot(traceStore);
    const [selected, setSelected] = useAtom(selectedProcessAtom);
    const [showCategories, setShowCategories] = useAtom(showCategoriesAtom);

    const start = async () => {
        const status = await traceManagerBus.startStream(true);
        setStreaming(status?.streaming ?? true);
    };
    const stop = async () => {
        const status = await traceManagerBus.stopStream();
        setStreaming(status?.streaming ?? false);
    };
    const clear = () => {
        clearAllWindows();
        setSelected(null);
    };

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="px-2 py-1.5 border-b flex items-center gap-2">
                <span className="text-xs font-semibold">Trace windows</span>

                <span className={cn("size-2 rounded-full", snap.streaming ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40")}
                    title={snap.streaming ? "Streaming" : "Stopped"} />

                <div className="ml-auto flex items-center gap-1">
                    <Button
                        size="xs"
                        variant={showCategories ? "secondary" : "ghost"}
                        onClick={() => setShowCategories(!showCategories)}
                        title="Show Trace Categories"
                        aria-pressed={showCategories}
                    >
                        <motion.span
                            animate={{ rotate: showCategories ? 180 : 0 }}
                            transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                            className="inline-flex"
                        >
                            <IconChevronLeft className="size-3.5" />
                        </motion.span>
                        <span className="sr-only">Show Trace Categories</span>
                    </Button>
                    {snap.streaming
                        ? <Button size="xs" variant="outline" onClick={stop}>Stop</Button>
                        : <Button size="xs" variant="outline" onClick={start}>Start</Button>}
                    <Button size="xs" variant="ghost" onClick={clear} disabled={snap.order.length === 0}>Clear</Button>
                </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                {snap.order.length === 0
                    ? (
                        <div className="p-3 text-xs text-muted-foreground">
                            No trace windows yet. Press <span className="font-medium">Start</span> to begin streaming.
                        </div>
                    )
                    : (
                        <div className="py-1">
                            {snap.order.map((pid) => {
                                const win = snap.windows[pid];
                                if (!win) {
                                    return null;
                                }
                                const isSelected = selected === pid;
                                return (
                                    <div
                                        key={pid}
                                        onClick={() => setSelected(pid)}
                                        className={cn(
                                            "px-2 py-1 text-xs flex items-center gap-2 cursor-pointer",
                                            isSelected ? "bg-primary/10" : "hover:bg-muted/50",
                                            !win.visible && "opacity-50",
                                        )}
                                    >
                                        <Checkbox
                                            checked={win.visible}
                                            onClick={(e) => e.stopPropagation()}
                                            onCheckedChange={(v) => setWindowVisible(pid, v === true)}
                                        />
                                        <span className="font-mono truncate">{win.name}</span>
                                        <span className="ml-auto tabular-nums text-muted-foreground">{win.calls.length}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
            </ScrollArea>
        </div>
    );
}
