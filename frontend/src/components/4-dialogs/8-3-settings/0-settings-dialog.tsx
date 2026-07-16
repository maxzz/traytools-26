import { type ComponentProps } from "react";
import { useSnapshot } from "valtio";
import { useAtom, type WritableAtom } from "jotai";
import { appSettings } from "@/store/1-ui-settings";
import { classNames } from "@/utils";
import { type ThemeMode } from "@/utils/theme-apply";
import { Button } from "@/ui/shadcn/button";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { HotkeyInput, type HotkeyChord } from "@/ui/local-ui/9-hotkey";
import {
    isOpenSettingsDialogAtom,
    settingsQuitOnCloseAtom,
    settingsRunElevatedAtom,
    settingsShowFooterAtom,
    settingsStartDpAgentHighAtom,
    settingsStayOnTopAtom,
    settingsUnloadHookHotkeyAtom,
} from "@/components/4-dialogs/8-3-settings/a-settings-atoms";

export function SettingsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenSettingsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-sm! gap-0!" aria-describedby={DESCRIPTION_ID}>

                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="font-condensed font-normal text-sm select-none">
                        Settings
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Application settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-4 text-xs font-condensed font-normal flex flex-col gap-1.5">
                    <ControlSwitch label="Run TrayTools elevated" valueAtom={settingsRunElevatedAtom} />
                    <ControlSwitch label="Start DPAgent elevated" title="Run DPAgent with High Rights (UAC elevation)" valueAtom={settingsStartDpAgentHighAtom} />
                    <ControlSwitch label="Make the window stay on top of all others" valueAtom={settingsStayOnTopAtom} />
                    <Separator />
                    <ControlSwitch label="Quit the application when the window close button is clicked" valueAtom={settingsQuitOnCloseAtom} />
                    <ControlSwitch label="Show window footer" valueAtom={settingsShowFooterAtom} />
                    <ControlTheme />
                    <Separator />
                    <ControlUnloadHookHotkey />
                </div>

                <DialogFooter className="m-0 px-4 pb-3 pt-2 flex justify-center!">
                    <Button type="button" variant="outline" className="min-w-16 font-condensed font-normal" onClick={() => setIsOpen(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Separator({ className, ...rest }: ComponentProps<"div">) {
    return <div className={classNames("border-t border-border", className)} {...rest} />;
}

function ControlSwitch({ label, valueAtom, className, ...rest }: ComponentProps<typeof Label> & { label: string; valueAtom: WritableAtom<boolean, [boolean], void>; }) {
    const [checked, setChecked] = useAtom(valueAtom);

    return (
        <Label className={classNames("-ml-2 font-normal flex items-center gap-0", className)} {...rest}>
            <Switch className="scale-50" checked={checked} onCheckedChange={setChecked} />
            {label}
        </Label>
    );
}

function ControlTheme({ className, ...rest }: ComponentProps<"div">) {
    const { theme } = useSnapshot(appSettings);

    return (
        <div className={classNames("flex items-center gap-2", className)} {...rest}>
            <Label className="font-normal" htmlFor="settings-theme">
                Theme
            </Label>

            <Select value={theme} onValueChange={(value) => { appSettings.theme = value as ThemeMode; }}>
                <SelectTrigger className="h-7!" id="settings-theme">
                    <SelectValue placeholder="Select theme" />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem className="font-condensed font-normal" value="light">Light</SelectItem>
                    <SelectItem className="font-condensed font-normal" value="dark">Dark</SelectItem>
                    <SelectItem className="font-condensed font-normal" value="system">System</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

function ControlUnloadHookHotkey() {
    const [state, setState] = useAtom(settingsUnloadHookHotkeyAtom);

    function setChord(chord: HotkeyChord | null) {
        setState({ chord, global: chord ? state.global : false, });
    }

    function setGlobal(global: boolean) {
        setState({ chord: state.chord, global, });
    }

    return (
        <div className="grid grid-cols-[auto_1fr] items-center gap-2 select-none">
            <div title="Send unload hook notification key">
                Send unload hook key
            </div>

            <HotkeyInput
                value={state.chord}
                onChange={setChord}
                isGlobal={state.global}
                onIsGlobalChange={setGlobal}
            />
        </div>
    );
}

const DESCRIPTION_ID = "settings-dialog-description";
