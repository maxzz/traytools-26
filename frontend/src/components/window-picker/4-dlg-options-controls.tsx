import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { normalizeDragIcon, normalizeOverlayCursor, type WindowPickerDragIcon } from "./9-types";

/** Window-picker preferences for the settings dialog. */
export function WindowPickerDialogControl() {
    const { winpicker_DragIcon, winpicker_OverlayCursor } = useSnapshot(appSettings);
    const value = normalizeDragIcon(winpicker_DragIcon);
    const pointer = normalizeOverlayCursor(winpicker_OverlayCursor);
    const overlay = value === "overlay";

    return (
        <div className="flex items-center gap-4">

            <Label className="font-normal shrink-0 gap-1.5" title="How the target icon is drawn while dragging over other windows">
                Drag icon

                <Select value={value} onValueChange={(next) => { appSettings.winpicker_DragIcon = next as WindowPickerDragIcon; }}>
                    <SelectTrigger className="h-6!">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem className="font-condensed font-normal" value="overlay" title="Layered window with per-pixel PNG alpha">
                            Transparent window
                        </SelectItem>
                        <SelectItem className="font-condensed font-normal" value="cursor" title="Replace the system cursor (HCURSOR); edges may look jagged">
                            System cursor
                        </SelectItem>
                    </SelectContent>
                </Select>
            </Label>

            {overlay && (
                <Label className="font-normal flex items-center gap-1.5 cursor-pointer" title="Keep the system pointer visible over the overlay and this app">
                    <Checkbox checked={pointer === "show"} onCheckedChange={(v) => { appSettings.winpicker_OverlayCursor = v === true ? "show" : "hide"; }} />
                    Show cursor
                </Label>
            )}
        </div>
    );
}
