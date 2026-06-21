import { appBus } from "@/bridge";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/ui/shadcn/menubar";

export function AppMenubar() {
    return (
        <Menubar>
            <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onSelect={() => appBus.exit().catch(console.error)}>
                        Exit
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    );
}
