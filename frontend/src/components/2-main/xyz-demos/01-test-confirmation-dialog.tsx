import { Button } from "@/ui/shadcn/button";
import { doAsyncExecuteConfirmDialogAtom } from "../../4-dialogs/8-1-confirmation/9-types-confirmation";
import { useSetAtom } from "jotai";

export function TestConfirmationDialog() {
    const doAsyncExecuteConfirmDialog = useSetAtom(doAsyncExecuteConfirmDialogAtom);

    async function onTestConfirmationDialog() {
        await doAsyncExecuteConfirmDialog({
            title: "Test Confirmation Dialog",
            message: "This is a test confirmation dialog",
            buttonOk: "OK",
            buttonCancel: "Cancel",
        });
    }

    return (
        <div>
            <Button
                variant="outline"
                onClick={onTestConfirmationDialog}
            >
                Test Confirmation Dialog
            </Button>
        </div >
    );
}
