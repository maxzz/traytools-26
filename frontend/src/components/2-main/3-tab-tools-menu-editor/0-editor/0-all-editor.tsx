import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS, savePanelLayout } from "@/store/2-panel-sizes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { ToolsConfig_Load } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { Panel_Tree } from "./2-0-panel-tree";
import { Panel_Props } from "./3-0-panel-props";
import { TopBar } from "./1-1-top-bar";
import { TreeViewMenu } from "./2-1-tree-menu";

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
            ToolsConfig_Load();
        },
        []);

    return (
        <div className="flex-1 size-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr] 1gap-1">
            <TopBar />

            <ResizablePanelGroup className="bg-card" orientation="horizontal" defaultLayout={mainLayout as Layout} onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.toolsEditorMain, layout)}>
                <ResizablePanel id="tree" minSize={22}>
                    <div className="relative size-full min-h-0">
                        <TreeViewMenu className="absolute top-1 right-1 z-10" />
                        <Panel_Tree />
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="props" minSize={30}>
                    <Panel_Props />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
