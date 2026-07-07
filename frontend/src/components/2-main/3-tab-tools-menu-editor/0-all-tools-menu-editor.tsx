import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { loadToolsConfig } from "@/store/5-tools-editor";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS, setPanelLayout } from "@/store/2-panel-sizes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { ToolsTree } from "./1-tools-tree";
import { ToolsProps } from "./2-tools-props";
import { ToolsEditorFooter } from "./3-tools-footer";

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
        <div className="flex-1 min-h-0 bg-card border rounded-md overflow-hidden flex flex-col">
            <ResizablePanelGroup orientation="horizontal" defaultLayout={mainLayout as Layout} onLayoutChanged={(layout) => setPanelLayout(PANEL_GROUPS.toolsEditorMain, layout)}>
                <ResizablePanel id="tree" minSize={22}>
                    <ToolsTree />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="props" minSize={30}>
                    <ToolsProps />
                </ResizablePanel>
            </ResizablePanelGroup>

            <ToolsEditorFooter />
        </div>
    );
}
