import { useSetAtom } from "jotai";
import { isOpenSettingsDialogAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { Button } from "@/ui/shadcn/button";
import { IconSliders } from "@/ui/icons/normal";

export function ButtonSettings() {
    const openSettingsDialog = useSetAtom(isOpenSettingsDialogAtom);

    return (
        <Button
            className="size-6 rounded text-foreground/75"
            variant="ghost"
            size="icon"
            onClick={() => openSettingsDialog(true)}
            title="Settings"
            type="button"
        >
            <IconSliders className="size-3.5 stroke-1.5!" />
        </Button>
    );
}
