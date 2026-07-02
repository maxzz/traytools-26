import { useCallback, useEffect, useState } from "react";
import { toolsBus, type ToolMenuNode, type ToolsMenuResponse } from "@/bridge";
import {
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
} from "@/ui/shadcn/menubar";

// The "Tools" menu is defined at runtime by tools.json (see the backend
// toolsmenu package). We (re)load the tree whenever the menu is opened so edits
// to the config file are picked up without restarting the app. `active` is
// driven by the parent Menubar's open value.
export function ToolsMenu({ value, active }: { value: string; active: boolean; }) {
    const [menu, setMenu] = useState<ToolsMenuResponse | null>(null);

    const reload = useCallback(() => {
        toolsBus.getMenu().then(setMenu).catch((e) => {
            console.error("Failed to load tools menu", e);
            setMenu({ found: false, path: "", error: String(e) });
        });
    }, []);

    useEffect(() => {
        if (active) {
            reload();
        }
    }, [active, reload]);

    const root = menu?.root;

    return (
        <MenubarMenu value={value}>
            <MenubarTrigger>Tools</MenubarTrigger>
            <MenubarContent>
                {!menu && (
                    <MenubarItem disabled>Loading...</MenubarItem>
                )}

                {menu && !menu.found && (
                    <MenubarItem disabled>No tools.json found</MenubarItem>
                )}

                {menu?.found && menu.error && (
                    <MenubarItem disabled className="text-destructive">
                        Invalid tools.json
                    </MenubarItem>
                )}

                {menu?.found && !menu.error && !root?.children?.length && (
                    <MenubarItem disabled>No tools defined</MenubarItem>
                )}

                {root?.children?.map((node, index) => (
                    <ToolNode key={nodeKey(node, index)} node={node} />
                ))}
            </MenubarContent>
        </MenubarMenu>
    );
}

function ToolNode({ node }: { node: ToolMenuNode; }) {
    if (node.kind === "separator") {
        return <MenubarSeparator />;
    }

    if (node.kind === "submenu") {
        return (
            <MenubarSub>
                <MenubarSubTrigger>{node.name}</MenubarSubTrigger>
                <MenubarSubContent>
                    {node.children?.map((child, index) => (
                        <ToolNode key={nodeKey(child, index)} node={child} />
                    ))}
                </MenubarSubContent>
            </MenubarSub>
        );
    }

    // Command leaf.
    return (
        <MenubarItem
            onSelect={() => {
                if (node.id != null) {
                    toolsBus.exec(node.id).catch((e) => console.error(`Failed to run "${node.name}"`, e));
                }
            }}
        >
            {node.name}
            {node.hotKey && <MenubarShortcut>{node.hotKey}</MenubarShortcut>}
        </MenubarItem>
    );
}

function nodeKey(node: ToolMenuNode, index: number): string {
    return `${node.kind}:${node.id ?? node.name}:${index}`;
}
