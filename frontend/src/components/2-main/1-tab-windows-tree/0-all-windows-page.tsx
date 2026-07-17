import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS, savePanelLayout } from "@/store/2-panel-sizes";
import { windowTreeStore, refreshWindowTree } from "@/components/2-main/1-tab-windows-tree/a-windows-tree-calls";
import { WindowTreeView } from "./2-0-windows-tree";
import { WindowProps } from "./5-window-props";
import { WindowTreeToolbar } from "./1-tree-toolbar";

// Windows Tree tab. A port of the legacy "User32 spy" window: a resizable
// [ window tree | properties ] split. The tree enumerates every top-level
// window and its children; selecting a node fetches and shows that window's
// details (General / Window Extra).

export function Page_WindowsTree() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.windowTreeMain];
    const loaded = useSnapshot(windowTreeStore).root !== null;

    // Load the tree once when the tab first mounts (unless already loaded).
    useEffect(
        () => {
            if (!loaded) {
                void refreshWindowTree();
            }
        }, [loaded]);

    return (
        <div className="flex-1 min-h-0 min-w-0 bg-card border overflow-hidden flex flex-col">
            <div className="bg-app-background/10">
                <WindowTreeToolbar className="m-1 1bg-red-500" />
            </div>

            <ResizablePanelGroup className="border-t border-border" orientation="horizontal" defaultLayout={mainLayout as Layout} onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.windowTreeMain, layout)}>
                <ResizablePanel id="tree" minSize={30}>
                    <WindowTreeView />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="props" minSize={25}>
                    <WindowProps />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
