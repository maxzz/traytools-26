import { type ComponentProps } from "react";
import { useSnapshot } from "valtio";
import { useAtom, type WritableAtom } from "jotai";
import { appSettings } from "@/store/1-ui-settings";
import {
    isOpenSettingsDialogAtom,
    settingsQuitOnCloseAtom,
    settingsRunElevatedAtom,
    settingsShowFooterAtom,
} from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { classNames } from "@/utils";
import { type ThemeMode } from "@/utils/theme-apply";
import { Button } from "@/ui/shadcn/button";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";

export function SettingsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenSettingsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-sm! gap-0!" aria-describedby={DESCRIPTION_ID}>

                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Settings
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Application settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-4 flex flex-col gap-4">
                    <ControlTheme />
                    <ControlSwitch label="Show footer" valueAtom={settingsShowFooterAtom} />
                    <ControlSwitch label="Run this app elevated" valueAtom={settingsRunElevatedAtom} />
                    <ControlSwitch label="Quit when window close button is clicked" valueAtom={settingsQuitOnCloseAtom} />
                </div>

                <DialogFooter className="m-0 px-4 pb-3 pt-2 flex justify-center!">
                    <Button type="button" variant="outline" className="min-w-16" onClick={() => setIsOpen(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type ControlSwitchProps = ComponentProps<typeof Label> & {
    label: string;
    valueAtom: WritableAtom<boolean, [boolean], void>;
};

function ControlSwitch({ label, valueAtom, className, ...rest }: ControlSwitchProps) {
    const [checked, setChecked] = useAtom(valueAtom);

    return (
        <Label className={classNames("flex items-center gap-2", className)} {...rest}>
            {label}
            <Switch checked={checked} onCheckedChange={setChecked} />
        </Label>
    );
}

function ControlTheme({ className, ...rest }: ComponentProps<"div">) {
    const { theme } = useSnapshot(appSettings);

    return (
        <div className={classNames("flex flex-col gap-1.5", className)} {...rest}>
            <Label htmlFor="settings-theme">
                Theme
            </Label>
            <Select value={theme} onValueChange={(value) => { appSettings.theme = value as ThemeMode; }}>
                <SelectTrigger className="w-full" id="settings-theme">
                    <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

const DESCRIPTION_ID = "settings-dialog-description";
