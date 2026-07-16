import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appBus } from "@/bridge";
import { getValidMainTab, VIEW_MENU_ITEMS } from "@/components/0-all/8-pages-array";
import { appSettings } from "@/store/1-ui-settings";
import { refreshWindowTree } from "@/store/4-windows-tree";
import { isOpenSettingsDialogAtom, settingsUnloadHookHotkeyAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { formatHotkey } from "@/ui/local-ui/9-hotkey";
import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/ui/shadcn/menubar";
import { ToolsMenu } from "./1-1-menu-tools";
import { sendUnloadHookNotification } from "../3-send-unload-msg-notice/3-2-unload-hook-action";

export function AppMenubar() {
    const openSettingsDialog = useSetAtom(isOpenSettingsDialogAtom);
    const unloadHookHotkey = useAtomValue(settingsUnloadHookHotkeyAtom);
    const unloadHookShortcut = formatHotkey(unloadHookHotkey.chord);
    const [menuValue, setMenuValue] = useState("");
    const settings = useSnapshot(appSettings);
    const activeTab = getValidMainTab(settings.mainTab);
    const activeView = VIEW_MENU_ITEMS.some((item) => item.id === activeTab) ? activeTab : "";

    return (
        <Menubar className="border-none" value={menuValue} onValueChange={setMenuValue}>

            <MenubarMenu value="file">
                <MenubarTrigger>
                    File
                </MenubarTrigger>

                <MenubarContent>
                    <MenubarSub>
                        <MenubarSubTrigger>
                            Preferences
                        </MenubarSubTrigger>

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
                    <MenubarRadioGroup value={activeView} onValueChange={(value) => { appSettings.mainTab = value; if (value === "windows-tree") { refreshWindowTree(); } }}>
                        {VIEW_MENU_ITEMS.map(
                            ({ id, label }) => (
                                <MenubarRadioItem key={id} value={id}>
                                    {label}
                                </MenubarRadioItem>
                            )
                        )}
                    </MenubarRadioGroup>

                    <MenubarSeparator />

                    <MenubarItem
                        className="pl-7"
                        onSelect={() => { void sendUnloadHookNotification(); }}
                        title="Just send notification to unload hook"
                    >
                        Send unload hook notification
                        {unloadHookShortcut && (
                            <MenubarShortcut>{unloadHookShortcut}</MenubarShortcut>
                        )}
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>

            <ToolsMenu value="tools" active={menuValue === "tools"} />

        </Menubar>
    );
}
