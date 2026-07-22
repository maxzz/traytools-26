import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS, savePanelLayout } from "@/store/2-panel-sizes";
import { ensureWindowTreeLoaded } from "@/components/2-main/2-tab-windows-tree/a-windows-tree-calls";
import { WindowTreeView } from "./2-0-windows-tree";
import { WindowProps } from "./5-window-props";
import { WindowTreeToolbar } from "./1-0-windows-toolbar";

// Windows Tree tab. A port of the legacy "User32 spy" window: a resizable
// [ window tree | properties ] split. The tree enumerates every top-level
// window and its children; selecting a node fetches and shows that window's
// details (General / Window Extra).

export function Page_WindowsTree() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.windowTreeMain];

    // Load on mount with backend wait + retries. ensureWindowTreeLoaded no-ops
    // when a tree is already present (e.g. returning to this tab).
    useEffect(
        () => {
            void ensureWindowTreeLoaded();
        }, []);

    return (
        <div className="flex-1 min-h-0 min-w-0 bg-card border overflow-hidden flex flex-col">
            <WindowTreeToolbar />

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
