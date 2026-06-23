import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { ConfirmationDialog } from "@/components/4-dialogs/8-1-confirmation/0-confirmation-dialog";
import { LoginDialog } from "@/components/4-dialogs/8-2-login/0-login-dialog";
import { isOpenSettingsDialogAtom, SettingsDialog, SettingsRunElevatedSync } from "@/components/4-dialogs/8-3-settings/0-settings-dialog";

export function AllDialogs() {
    return (<>
        <SettingsDialogShortcut />
        <SettingsRunElevatedSync />
        
        <ConfirmationDialog />
        <LoginDialog />
        <SettingsDialog />
    </>);
}

function SettingsDialogShortcut() {
    const openSettingsDialog = useSetAtom(isOpenSettingsDialogAtom);

    useEffect(
        () => {
            function handleKeyDown(event: KeyboardEvent) {
                if (!event.ctrlKey || event.key !== ",") {
                    return;
                }

                const target = event.target;
                if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) {
                    return;
                }

                event.preventDefault();
                openSettingsDialog(true);
            }

            const controller = new AbortController();
            window.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [openSettingsDialog],
    );

    return null;
}
