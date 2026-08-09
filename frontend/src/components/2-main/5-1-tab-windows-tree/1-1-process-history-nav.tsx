import { useAtomValue } from "jotai";
import { classNames } from "@/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/ui/shadcn/context-menu";
import { clearProcessHistory, goProcessHistoryBack, goProcessHistoryForward, navigateProcessHistoryTo, processHistoryBackEntries, processHistoryForwardEntries } from "./a-process-history";
import { groupByProcessAtom, processHistoryAtom, type ProcessHistoryEntry } from "./s-windows-tree-state";

/** Back/forward process selection history (visible only when grouping by process). */
export function ProcessHistoryNav() {
    const groupByProcess = useAtomValue(groupByProcessAtom);
    const history = useAtomValue(processHistoryAtom);

    if (!groupByProcess) {
        return null;
    }

    const canBack = history.index > 0;
    const canForward = history.index >= 0 && history.index < history.entries.length - 1;
    const backItems = processHistoryBackEntries(history);
    const forwardItems = processHistoryForwardEntries(history);
    const hasAny = history.entries.length > 0;

    return (
        <div className="shrink-0 ml-1 flex items-center gap-0.5">
            <HistoryNavButton
                direction="back"
                onNavigate={goProcessHistoryBack}
                disabled={!canBack}
                items={backItems}
                hasHistory={hasAny}
                title="Previous process"
            />
            <HistoryNavButton
                direction="forward"
                onNavigate={goProcessHistoryForward}
                disabled={!canForward}
                items={forwardItems}
                hasHistory={hasAny}
                title="Next process"
            />
        </div>
    );
}

function HistoryNavButton({ direction, disabled, items, hasHistory, title, onNavigate }: {
    direction: "back" | "forward";
    disabled: boolean;
    items: { entry: ProcessHistoryEntry; index: number; }[];
    hasHistory: boolean;
    title: string;
    onNavigate: () => void;
}) {
    const Icon = direction === "back" ? ChevronLeft : ChevronRight;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <span className={classNames("inline-flex", disabled && "opacity-50")}>
                    <Button
                        className="size-6 rounded"
                        onClick={onNavigate}
                        disabled={disabled}
                        title={`${title} (right-click for list)`}
                        aria-label={title}
                        size="icon-xs"
                        variant="outline"
                        type="button"
                    >
                        <Icon className="size-3.5 text-muted-foreground" />
                    </Button>
                </span>
            </ContextMenuTrigger>

            <ContextMenuContent className="min-w-48 max-w-72">
                {items.length === 0
                    ? (
                        <ContextMenuItem disabled className="text-xs text-muted-foreground">
                            No {direction === "back" ? "previous" : "next"} processes
                        </ContextMenuItem>
                    )
                    : items.map(
                        ({ entry, index }) => (
                            <ContextMenuItem className="text-xs" onSelect={() => navigateProcessHistoryTo(index)} key={`${direction}-${index}-${entry.processId}`}>
                                <span className="truncate">
                                    {entry.processName}
                                    <span className="ml-1 font-mono text-[0.65rem] text-muted-foreground">
                                        {entry.processId}
                                    </span>
                                </span>
                            </ContextMenuItem>
                        )
                    )}

                <ContextMenuSeparator />

                <ContextMenuItem className="text-xs" onSelect={() => clearProcessHistory()} disabled={!hasHistory}>
                    Clear list
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
