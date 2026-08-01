import { useAtom } from "jotai";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { checkDetailsDialogAtom } from "../../a-atoms/2-run-sync";
import { CheckDetailsTree, JobFooter } from "./4-1-check-details-tree";

export function CheckDetailsDialog() {
    const [payload, setPayload] = useAtom(checkDetailsDialogAtom);
    const open = payload != null;

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next) setPayload(null); }}>
            <DialogContent className="p-0! max-w-xl! gap-0!" aria-describedby={DESCRIPTION_ID}>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm font-condensed font-normal select-none truncate">
                        {payload?.label ?? "Check Details"}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Folder comparison details.
                    </DialogDescription>
                </DialogHeader>

                {payload && (<>
                    <div className="px-4 pt-3 text-xs text-sky-600 dark:text-cyan-400">
                        Check
                    </div>
                    <div className="px-4">
                        <JobFooter response={payload.response} />
                    </div>
                </>)}

                <ScrollArea2 className="max-h-[min(70vh,32rem)] px-4 py-3">
                    {payload && <CheckDetailsTree response={payload.response} />}
                </ScrollArea2>

                <DialogFooter className="m-0 px-4 pb-3 pt-2 flex justify-center!">
                    <Button
                        type="button"
                        variant="outline"
                        className="min-w-16 font-condensed font-normal"
                        onClick={() => setPayload(null)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const DESCRIPTION_ID = "sync-check-details-dialog-description";
