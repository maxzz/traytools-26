import { useAtom } from "jotai";
import { settingsStayOnTopAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { Button } from "@/ui/shadcn/button";
import { IconPictureInPicture } from "@/ui/icons/normal";

export function ButtonStayOnTop() {
    const [stayOnTop, setStayOnTop] = useAtom(settingsStayOnTopAtom);

    return (
        <Button
            className="size-6 rounded"
            variant="ghost"
            size="icon"
            onClick={() => setStayOnTop(!stayOnTop)}
            title={stayOnTop ? "Disable always on top" : "Keep window always on top"}
            type="button"
            aria-pressed={stayOnTop}
        >
            <IconPictureInPicture
                className="size-3.5"
                fillClasses={stayOnTop ? "fill-current" : undefined}
            />
        </Button>
    );
}
