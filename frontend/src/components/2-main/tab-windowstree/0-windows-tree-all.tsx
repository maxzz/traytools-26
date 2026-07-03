import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS } from "@/store/2-panel-sizes";
import { windowTreeStore, refreshWindowTree } from "@/store/4-windows-tree";
import { WindowTreeView } from "./b-windows-tree-view";
import { WindowProps } from "./d-window-props";

// Windows Tree tab. A port of the legacy "User32 spy" window: a resizable
// [ window tree | properties ] split. The tree enumerates every top-level
// window and its children; selecting a node fetches and shows that window's
// details (General / Styles / Class / Process).

export function PageWindowsTree() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.windowTreeMain];
    const loaded = useSnapshot(windowTreeStore).root !== null;

    const onMainLayoutChanged = (layout: Layout) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, [PANEL_GROUPS.windowTreeMain]: layout };
    };

    // Load the tree once when the tab first mounts (unless already loaded).
    useEffect(
        () => {
            if (!loaded) {
                void refreshWindowTree();
            }
        }, [loaded]);

    return (
        <div className="flex-1 min-h-0 min-w-0 bg-card border rounded-md overflow-hidden">
            <ResizablePanelGroup orientation="horizontal" className="min-w-0 overflow-hidden" defaultLayout={mainLayout as Layout} onLayoutChanged={onMainLayoutChanged}>
                <ResizablePanel id="tree" minSize={30} className="min-w-0 overflow-hidden">
                    <WindowTreeView />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="props" minSize={25} className="min-w-0 overflow-hidden">
                    <WindowProps />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
