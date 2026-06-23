import { useAtom } from "jotai";
import { classNames } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { type ConfirmationData, isOpenConfirmDialogAtom } from "@/components/4-dialogs/8-1-confirmation/9-types-confirmation";

export function ConfirmationDialog() {
    const [confirmData, setConfirmData] = useAtom(isOpenConfirmDialogAtom);
    if (!confirmData) {
        return null;
    }

    const currentConfirmData = confirmData;

    function onDlgClose(ok: boolean) {
        setConfirmData(undefined);
        currentConfirmData.resolve(ok);
    }

    return (
        <Dialog open={!!currentConfirmData} onOpenChange={() => onDlgClose(false)}>
            <DialogContent className="p-0! max-w-sm! gap-0!" aria-describedby={DESCRIPTION_ID} modal>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        {currentConfirmData.ui.title}
                    </DialogTitle>

                    <DialogDescription className="sr-only">
                        Confirmation required before continuing.
                    </DialogDescription>
                </DialogHeader>

                <Body confirmDialogOpen={currentConfirmData} onDlgClose={onDlgClose} />
            </DialogContent>
        </Dialog>
    );
}

function Body({ confirmDialogOpen, onDlgClose }: { confirmDialogOpen: ConfirmationData; onDlgClose: (ok: boolean) => void; }) {
    const { ui: { icon, message, buttonOk, buttonCancel, isDafaultOk } } = confirmDialogOpen;
    return (
        <div className="px-4 py-3 flex flex-col gap-3">
            <div id={DESCRIPTION_ID} className="text-xs text-foreground/90 flex items-start gap-2 leading-5">
                {icon
                    ? (
                        <div className="shrink-0 mt-0.5 text-amber-600">
                            {icon}
                        </div>
                    )
                    : null
                }

                <div className="min-w-0">
                    {message}
                </div>
            </div>

            <DialogFooter className={classNames("pt-2 pb-3 flex-row", buttonCancel ? "justify-end" : "justify-center")}>
                <Button variant={isDafaultOk ? "default" : "outline"} onClick={() => onDlgClose(true)} className="min-w-16">
                    {buttonOk}
                </Button>

                {buttonCancel && (
                    <Button variant={isDafaultOk ? "outline" : "default"} onClick={() => onDlgClose(false)} className="min-w-16">
                        {buttonCancel}
                    </Button>
                )}
            </DialogFooter>
        </div>
    );
}

const DESCRIPTION_ID = "confirmation-dialog-message";
