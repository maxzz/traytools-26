import { useState } from "react";
import { useSetAtom } from "jotai";
import { appBus } from "@/bridge";
import { appSettings } from "@/store/1-ui-settings";
import { refreshWindowTree } from "@/store/4-windows-tree";
import { isOpenSettingsDialogAtom } from "@/components/4-dialogs/8-3-settings/0-settings-dialog";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/ui/shadcn/menubar";
import { ToolsMenu } from "./1-1-menu-tools";

export function AppMenubar() {
    const openSettingsDialog = useSetAtom(isOpenSettingsDialogAtom);
    const [menuValue, setMenuValue] = useState("");

    return (
        <Menubar value={menuValue} onValueChange={setMenuValue}>

            <MenubarMenu value="file">
                <MenubarTrigger>
                    File
                </MenubarTrigger>

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

                    <MenubarSeparator />

                    <MenubarItem onSelect={() => appBus.exit().catch(console.error)}>
                        Exit
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>

            <MenubarMenu value="view">
                <MenubarTrigger>
                    View
                </MenubarTrigger>

                <MenubarContent>
                    <MenubarItem onSelect={() => { appSettings.mainTab = "windows-tree"; refreshWindowTree(); }}>
                        Show Windows Tree...
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>

            <ToolsMenu value="tools" active={menuValue === "tools"} />
            
        </Menubar>
    );
}
