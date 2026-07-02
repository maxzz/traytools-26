import { useState } from "react";
import { useSetAtom } from "jotai";
import { appBus } from "@/bridge";
import { isOpenSettingsDialogAtom } from "@/components/4-dialogs/8-3-settings/0-settings-dialog";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/ui/shadcn/menubar";
import { ToolsMenu } from "./a-tools-menu";

export function AppMenubar() {
    const openSettingsDialog = useSetAtom(isOpenSettingsDialogAtom);
    const [menuValue, setMenuValue] = useState("");

    return (
        <Menubar value={menuValue} onValueChange={setMenuValue}>
            <MenubarMenu value="file">
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>

                    <MenubarSub>
                        <MenubarSubTrigger>Preferences</MenubarSubTrigger>
                        <MenubarSubContent>
                            <MenubarItem onSelect={() => openSettingsDialog(true)}>
                                Settings...
                                <MenubarShortcut>Ctrl+,</MenubarShortcut>
                            </MenubarItem>
                        </MenubarSubContent>
                    </MenubarSub>

                    <MenubarItem onSelect={() => appBus.exit().catch(console.error)}>
                        Exit
                    </MenubarItem>

                </MenubarContent>
            </MenubarMenu>

            <ToolsMenu value="tools" active={menuValue === "tools"} />
        </Menubar>
    );
}
