import { useEffect, useState } from "react";
import { cn } from "@/utils/classnames";
import { AlertCircle, Check, Loader2, Minus } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { type CopyProgressRow, type CopyProgressState, closeCopyProgress, getCopyProgress, subscribeCopyProgress } from "../a-atoms/2-run-copy";
import { itemLabel } from "../a-atoms/9-types-copy";

export function CopyReportDialog() {
    const [state, setState] = useState<CopyProgressState>(getCopyProgress);

    useEffect(() => subscribeCopyProgress(setState), []);

    return (
        <Dialog open={state.open} onOpenChange={(open) => { if (!open) { closeCopyProgress(); } }}>
            <DialogContent className="p-0 max-w-xl">
                <DialogHeader className="p-4 pb-0 gap-0">
                    <DialogTitle>
                        Copy report
                    </DialogTitle>
                    <DialogDescription>
                        {state.running
                            ? "Copy in progress…"
                            : <span className="text-[0.65rem] text-emerald-600 dark:text-emerald-400">Copy completed.</span>
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4">
                    {state.setupError && (
                        <p className="text-sm text-destructive">{state.setupError}</p>
                    )}

                    <ScrollArea className="max-h-72">
                        <div className="pr-2 text-sm flex flex-col gap-1">
                            {state.rows.map(
                                (row, i) => (
                                    <ReportRow key={i} row={row} />
                                )
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="m-0 py-2">
                    <Button type="button" variant="outline" disabled={state.running} onClick={closeCopyProgress}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ReportRow({ row }: { row: CopyProgressRow; }) {
    const name = itemLabel({ sourceFile: row.sourceFile });
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
            <span className="truncate" title={row.sourceFile}>{name}</span>
            <span className="text-muted-foreground truncate" title={row.destFolder}>{row.destFolder || "—"}</span>
            <StatusBadge row={row} />
        </div>
    );
}

function StatusBadge({ row }: { row: CopyProgressRow; }) {
    if (row.status === "pending") {
        return (
            <span className="min-w-20 text-muted-foreground inline-flex items-center gap-1 justify-end">
                <Loader2 className="size-3.5 animate-spin" />
                pending
            </span>
        );
    }

    if (row.status === "skipped") {
        return (
            <span className="min-w-20 text-muted-foreground inline-flex items-center gap-1 justify-end">
                <Minus className="size-3.5" />
                skipped
            </span>
        );
    }

    if (row.status === "copied") {
        return (
            <span className={cn("min-w-20 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 justify-end")}>
                <Check className="size-3.5" />
                copied
            </span>
        );
    }

    return (
        <span className="min-w-20 text-destructive inline-flex items-center gap-1 justify-end">
            failed
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" className="inline-flex" aria-label="Failure details">
                            <AlertCircle className="size-3.5" />
                        </button>
                    </TooltipTrigger>

                    <TooltipContent side="left" className="max-w-80">
                        {row.error || "Unknown error"}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </span>
    );
}
