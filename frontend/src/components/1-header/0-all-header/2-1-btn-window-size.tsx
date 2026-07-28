import { useEffect, useState } from "react";
import { classNames } from "@/utils/classnames";
import { IconAppMini } from "@/ui/icons/normal";
import { Button } from "@/ui/shadcn/button";
import { settingsBus, type WindowSizeKey } from "@/bridge/groups/settings";

/**
 * Toggles between the "mini" and "normal" named window geometries.
 * Geometry per key (and the active key) is persisted in init.json by the backend.
 * Later this can become a dropdown that calls setWindowSizeKey with other keys.
 */
export function ButtonWindowSize() {
    const [sizeKey, setSizeKey] = useState<WindowSizeKey>("normal");

    useEffect(() => {
        let cancelled = false;
        settingsBus.getWindowSizeKey()
            .then((key) => {
                if (!cancelled && key) {
                    setSizeKey(key);
                }
            })
            .catch(console.error);
        return () => { cancelled = true; };
    }, []);

    const isMini = sizeKey === "mini";

    return (
        <Button
            className={classNames("size-6 rounded", isMini ? "text-current" : "text-foreground/75")}
            variant="ghost"
            size="icon"
            onClick={() => {
                settingsBus.toggleWindowSize()
                    .then(setSizeKey)
                    .catch(console.error);
            }}
            title={isMini ? "Expand to normal size" : "Collapse to mini size"}
            type="button"
            aria-pressed={isMini}
        >
            <IconAppMini
                className={classNames("size-3.5", isMini ? "rotate-180" : "", isMini ? "fill-foreground" : undefined)}
                fillClasses={undefined}
                isMini={isMini}
            />
        </Button>
    );
}
