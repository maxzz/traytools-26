import { atom, useAtom } from "jotai";
import { SymbolWarning } from "@/ui/icons";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";

export type UnsavedQuitChoice = "save" | "discard" | "cancel";

type UnsavedQuitDialogData = {
    tabs: string[];
    resolve: (choice: UnsavedQuitChoice) => void;
};

const unsavedQuitDialogAtom = atom<UnsavedQuitDialogData | undefined>(undefined);

export const doAsyncUnsavedQuitDialogAtom = atom(
    null,
    async (_get, set, tabs: string[]): Promise<UnsavedQuitChoice> => {
        return await new Promise<UnsavedQuitChoice>(
            (resolve) => {
                set(unsavedQuitDialogAtom, { tabs, resolve });
            },
        );
    },
);

export function UnsavedQuitDialog() {
    const [data, setData] = useAtom(unsavedQuitDialogAtom);
    if (!data) {
        return null;
    }

    const current = data;

    function close(choice: UnsavedQuitChoice) {
        setData(undefined);
        current.resolve(choice);
    }

    return (
        <Dialog open onOpenChange={() => close("cancel")}>
            <DialogContent className="p-0! max-w-sm! gap-0!" aria-describedby={DESCRIPTION_ID} modal>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Unsaved changes
                    </DialogTitle>

                    <DialogDescription className="sr-only">
                        Choose whether to save unsaved tab data before closing.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-3 flex flex-col gap-3">
                    <div id={DESCRIPTION_ID} className="text-xs text-foreground/90 flex items-start gap-2 leading-5">
                        <div className="shrink-0 mt-0.5 text-amber-600">
                            <SymbolWarning className="p-0.5 size-6" />
                        </div>

                        <div className="min-w-0 space-y-2">
                            <p>The following tabs have unsaved data:</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                {current.tabs.map(
                                    (tab) => (
                                        <li key={tab} className="font-medium text-orange-600">
                                            {tab}
                                        </li>
                                    ),
                                )}
                            </ul>
                            <p>Save before closing the application?</p>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 pb-3 flex-row flex-wrap justify-end gap-2">
                        <Button variant="default" onClick={() => close("save")} className="min-w-16">
                            Save
                        </Button>
                        <Button variant="outline" onClick={() => close("discard")} className="min-w-16">
                            Don&apos;t save
                        </Button>
                        <Button variant="outline" onClick={() => close("cancel")} className="min-w-16">
                            Cancel
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const DESCRIPTION_ID = "unsaved-quit-dialog-message";
