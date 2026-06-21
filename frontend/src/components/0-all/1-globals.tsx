import { ConfirmationDialog } from "@/components/4-dialogs/8-1-confirmation/0-confirmation-dialog";
import { LoginDialog } from "@/components/4-dialogs/8-2-login/0-login-dialog";
import { SettingsDialog } from "@/components/4-dialogs/8-3-settings/0-settings-dialog";

export function AllDialogs() {
    return (<>
        <ConfirmationDialog />
        <LoginDialog />
        <SettingsDialog />
    </>);
}
