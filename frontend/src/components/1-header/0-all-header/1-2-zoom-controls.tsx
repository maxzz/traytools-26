import { useAtomValue } from "jotai";
import { zoomLevelAtom } from "@/store/4-atoms-zoom";
import { zoomAction } from "@/wails/zoom";
import { IconZoomMinus, IconZoomPlus, IconZoomReset } from "@/ui/icons";
import { Button } from "@/ui/shadcn/button";
import { MenubarItem } from "@/ui/shadcn/menubar";

export function ZoomControls() {
    const zoomLevel = useAtomValue(zoomLevelAtom);
    const zoomPercent = Math.round((1.2 ** zoomLevel) * 100);

    return (
        <MenubarItem
            className="justify-between focus:bg-transparent cursor-default"
            onSelect={(event) => event.preventDefault()}
        >
            <span className="text-xs font-normal">Zoom</span>

            <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button
                    className="size-6 rounded-sm"
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        zoomAction("out");
                    }}
                    title="Zoom Out (Ctrl+-)"
                >
                    <IconZoomMinus className="size-3" />
                </Button>

                <span className="w-10 text-center text-xs tabular-nums">{zoomPercent}%</span>

                <Button
                    className="size-6 rounded-sm"
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        zoomAction("in");
                    }}
                    title="Zoom In (Ctrl+=)"
                >
                    <IconZoomPlus className="size-3" />
                </Button>

                <Button
                    className="ml-1 size-6 rounded-sm"
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        zoomAction("reset");
                    }}
                    disabled={zoomLevel === 0}
                    title="Reset Zoom (Ctrl+0)"
                >
                    <IconZoomReset className="size-3" />
                </Button>
            </div>
        </MenubarItem>
    );
}
