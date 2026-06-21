import { atom, useAtom } from "jotai";
import { type ThemeMode } from "@/utils/theme-apply";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";

export function SettingsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenSettingsDialogAtom);
    const [theme, setTheme] = useAtom(settingsThemeAtom);
    const [showFooter, setShowFooter] = useAtom(settingsShowFooterAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-sm! gap-0! p-0!" aria-describedby={DESCRIPTION_ID} modal>

                <DialogHeader className="gap-0 border-b px-4 py-3 text-left">
                    <DialogTitle className="text-sm">
                        Settings
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Application settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="settings-theme">
                            Theme
                        </Label>
                        <Select value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
                            <SelectTrigger id="settings-theme" className="w-full">
                                <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="settings-show-footer">
                            Show footer
                        </Label>
                        <Switch
                            id="settings-show-footer"
                            checked={showFooter}
                            onCheckedChange={setShowFooter}
                        />
                    </div>
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

export const isOpenSettingsDialogAtom = atom(false);
export const settingsThemeAtom = atom<ThemeMode>("light");
export const settingsShowFooterAtom = atom(true);

const DESCRIPTION_ID = "settings-dialog-description";
