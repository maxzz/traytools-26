import { type ComponentProps, useEffect } from "react";
import { atom, useAtom, useSetAtom, type WritableAtom } from "jotai";
import { settingsBus } from "@/bridge/groups/settings";
import { appSettings } from "@/store/1-ui-settings";
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
            <DialogContent className="p-0! max-w-sm! gap-0!" aria-describedby={DESCRIPTION_ID} modal>

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

                <DialogFooter className="px-4 pb-4 pt-2 flex flex-row justify-end">
                    <Button type="button" variant="default" className="min-w-16" onClick={() => setIsOpen(false)}>
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
    const [theme, setTheme] = useAtom(settingsThemeAtom);

    return (
        <div className={classNames("flex flex-col gap-1.5", className)} {...rest}>
            <Label htmlFor="settings-theme">
                Theme
            </Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
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

export const isOpenSettingsDialogAtom = atom(false);
export const settingsThemeAtom = atom<ThemeMode>("light");
const settingsShowFooterBaseAtom = atom(appSettings.showFooter);

export const settingsShowFooterAtom = atom(
    (get) => get(settingsShowFooterBaseAtom),
    (_get, set, next: boolean) => {
        set(settingsShowFooterBaseAtom, next);
        appSettings.showFooter = next;
    },
);

const settingsRunElevatedBaseAtom = atom(false);

export const settingsRunElevatedAtom = atom(
    (get) => get(settingsRunElevatedBaseAtom),
    (_get, set, next: boolean) => {
        set(settingsRunElevatedBaseAtom, next);
        settingsBus.setRunElevated(next)
            .then(() => {
                if (next) {
                    return settingsBus.requestElevationRestart();
                }
            })
            .catch(console.error);
    },
);

export function SettingsRunElevatedSync() {
    const setRunElevated = useSetAtom(settingsRunElevatedBaseAtom);

    useEffect(
        () => {
            settingsBus.getRunElevated().then(setRunElevated).catch(console.error);
        },
        [setRunElevated],
    );

    return null;
}

const settingsQuitOnCloseBaseAtom = atom(false);

export const settingsQuitOnCloseAtom = atom(
    (get) => get(settingsQuitOnCloseBaseAtom),
    (_get, set, next: boolean) => {
        set(settingsQuitOnCloseBaseAtom, next);
        settingsBus.setQuitOnClose(next).catch(console.error);
    },
);

export function SettingsQuitOnCloseSync() {
    const setQuitOnClose = useSetAtom(settingsQuitOnCloseBaseAtom);

    useEffect(
        () => {
            settingsBus.getQuitOnClose().then(setQuitOnClose).catch(console.error);
        },
        [setQuitOnClose],
    );

    return null;
}

const DESCRIPTION_ID = "settings-dialog-description";
