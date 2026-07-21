import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Minus } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/ui/shadcn/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { cn } from "@/utils/classnames";
import {
    closeCopyProgress,
    getCopyProgress,
    subscribeCopyProgress,
    type CopyProgressRow,
    type CopyProgressState,
} from "../a-atoms/2-run-copy";
import { itemLabel } from "../a-atoms/9-types-copy";

export function CopyStatusDialog() {
    const [state, setState] = useState<CopyProgressState>(getCopyProgress);

    useEffect(() => subscribeCopyProgress(setState), []);

    return (
        <Dialog
            open={state.open}
            onOpenChange={(open) => {
                if (!open) {
                    closeCopyProgress();
                }
            }}
        >
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Copy status</DialogTitle>
                    <DialogDescription>
                        {state.running ? "Copy in progress…" : "Copy finished."}
                    </DialogDescription>
                </DialogHeader>

                {state.setupError && (
                    <p className="text-sm text-destructive">{state.setupError}</p>
                )}

                <ScrollArea className="max-h-72">
                    <div className="pr-2 flex flex-col gap-1">
                        {state.rows.map((row, i) => (
                            <StatusRow key={i} row={row} />
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={state.running} onClick={closeCopyProgress}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function StatusRow({ row }: { row: CopyProgressRow; }) {
    const name = itemLabel({ sourceFile: row.sourceFile });
    return (
        <div className="py-1 text-sm last:border-0 border-b border-border/60 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
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
