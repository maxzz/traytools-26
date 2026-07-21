import { type ConfirmationUi } from "./9-types-confirmation";
import { SymbolWarning } from "@/ui/icons";

const confirmOverwriteSavedPathMessages: ConfirmationUi = {
    title: "Overwrite saved path?",
    icon: <SymbolWarning className="p-0.5 size-6" />,
    message: "",
    buttonOk: "Overwrite",
    buttonCancel: "Cancel",
    isDafaultOk: false,
};

export function getConfirmOverwriteSavedPathMessages(name: string): ConfirmationUi {
    return {
        ...confirmOverwriteSavedPathMessages,
        message: (<>
            A saved path named <span className="font-medium text-orange-600">{name}</span> already exists.
            Save will replace its stored path data and update timestamp.
        </>),
    };
}

export const confirmElevationRestartMessages: ConfirmationUi = {
    title: "Administrator privileges required",
    icon: <SymbolWarning className="p-0.5 size-6" />,
    message: (
        <>
            This copy operation requires elevated privileges.
            <br /><br />
            Relaunch TrayTools as administrator now? You can re-run Copy after the restart.
        </>
    ),
    buttonOk: "Relaunch",
    buttonCancel: "Cancel",
    isDafaultOk: false,
};