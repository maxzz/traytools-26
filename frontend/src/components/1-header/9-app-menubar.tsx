import { useSetAtom } from "jotai";
import { appBus } from "@/bridge";
import { isOpenSettingsDialogAtom } from "@/components/4-dialogs/8-3-settings/0-settings-dialog";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/ui/shadcn/menubar";

export function AppMenubar() {
    const openSettingsDialog = useSetAtom(isOpenSettingsDialogAtom);

    return (
        <Menubar>
            <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onSelect={() => openSettingsDialog(true)}>
                        Settings
                    </MenubarItem>
                    <MenubarItem onSelect={() => appBus.exit().catch(console.error)}>
                        Exit
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    );
}
