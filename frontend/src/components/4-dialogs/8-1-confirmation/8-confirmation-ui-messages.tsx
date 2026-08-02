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

export const confirmRegistryElevationRestartMessages: ConfirmationUi = {
    title: "Administrator privileges required",
    icon: <SymbolWarning className="p-0.5 size-6" />,
    message: (
        <>
            Writing to this registry hive requires elevated privileges.
            <br /><br />
            Relaunch TrayTools as administrator now? You can re-run Write after the restart.
        </>
    ),
    buttonOk: "Relaunch",
    buttonCancel: "Cancel",
    isDafaultOk: false,
};

export function getConfirmRegistryWriteMessages(count: number, label: string): ConfirmationUi {
    return {
        title: count === 1 ? "Write registry value?" : "Write registry values?",
        icon: <SymbolWarning className="p-0.5 size-6" />,
        message: (<>
            This will modify the Windows registry: <span className="font-medium text-orange-600">{count}</span>
            {count === 1 ? " value" : " values"} from <span className="font-medium text-orange-600">{label}</span>.
            <br /><br />
            Existing values will be overwritten and missing keys created.
        </>),
        buttonOk: "Write",
        buttonCancel: "Cancel",
        isDafaultOk: false,
    };
}