import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { loadToolsConfig } from "@/components/2-main/3-tab-tools-menu-editor/a-menu-editor-atoms";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS, setPanelLayout } from "@/store/2-panel-sizes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { ToolsTree } from "./2-0-tree";
import { ToolsProps } from "./3-0-current-props";
import { ToolsEditorFooter } from "./1-2-footer";
import { TreeViewMenu } from "./1-1-tree-toolbar";

// Tools Menu editor. Lets the user edit the "Tools" menu tree and write it to
// tools.json with a single button. The tree (left) is loaded from the on-disk
// file (same location the menu reads), or from the localStorage copy when the
// file is missing. Selecting a node shows its properties on the right. Nodes can
// be reordered / re-nested by drag-and-drop, and added / removed via the toolbar.

export function Page_ToolsMenuEditor() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.toolsEditorMain];

    useEffect(
        () => {
            loadToolsConfig();
        },
        []);

    return (
        <div className="flex-1 size-full min-h-0 overflow-hidden grid grid-rows-[1fr_auto] 1gap-1">

            <ResizablePanelGroup className="bg-card" orientation="horizontal" defaultLayout={mainLayout as Layout} onLayoutChanged={(layout) => setPanelLayout(PANEL_GROUPS.toolsEditorMain, layout)}>
                <ResizablePanel id="tree" minSize={22}>
                    <div className="relative size-full min-h-0">
                        <TreeViewMenu />
                        <ToolsTree />
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="props" minSize={30}>
                    <ToolsProps />
                </ResizablePanel>
            </ResizablePanelGroup>


            <div className="pb-4 bg-red-500 border rounded-md">
                <ToolsEditorFooter />
            </div>

        </div>
    );
}
