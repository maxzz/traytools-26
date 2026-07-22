import { useAtom } from "jotai";
import { classNames } from "@/utils/classnames";
import { IconPictureInPicture } from "@/ui/icons/normal";
import { Button } from "@/ui/shadcn/button";
import { settingsStayOnTopAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";

export function ButtonStayOnTop() {
    const [stayOnTop, setStayOnTop] = useAtom(settingsStayOnTopAtom);

    return (
        <Button
            className={classNames("size-6 rounded", stayOnTop ? "text-current" : "text-foreground/75")}
            variant="ghost"
            size="icon"
            onClick={() => setStayOnTop(!stayOnTop)}
            title={stayOnTop ? "Now is always on top" : "Now is not always on top"}
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
