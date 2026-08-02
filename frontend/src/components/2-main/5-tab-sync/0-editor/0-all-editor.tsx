import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { type Layout } from "react-resizable-panels";
import { PANEL_GROUPS, savePanelLayout } from "@/store/2-panel-sizes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { Panel_Tree } from "./2-tree/2-0-panel-tree";
import { Panel_Props } from "./3-props/3-0-panel-props";
import { SyncOperationsToolbar } from "./1-1-sync-toolbar";
import { TreeViewMenu } from "./2-tree/2-1-tree-menu";
import { SyncReportPanel } from "./4-report/4-0-report-sync";
import { CheckDetailsDialog } from "./4-report/4-2-check-details-dialog";
import { initPathDropListener } from "@/components/2-main/a-shared/path-input";

export function Page_Sync() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.syncEditorMain];
    const verticalLayout = panelSizes[PANEL_GROUPS.syncEditorVertical];

    // File hydration lives in SyncConfigSync (app-level) so switching away
    // and back only remounts this UI against the preserved valtio store.
    useEffect(
        () => {
            initPathDropListener();
        },
        []);

    return (
        <div className="flex-1 size-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr] gap-0.5">
            <SyncOperationsToolbar />

            <ResizablePanelGroup
                className="bg-card"
                orientation="vertical"
                defaultLayout={verticalLayout as Layout}
                onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.syncEditorVertical, layout)}
            >
                <ResizablePanel id="editor" minSize={30}>
                    <ResizablePanelGroup
                        className="size-full"
                        orientation="horizontal"
                        defaultLayout={mainLayout as Layout}
                        onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.syncEditorMain, layout)}
                    >
                        <ResizablePanel id="tree" minSize={22}>
                            <div className="relative size-full min-h-0">
                                <TreeViewMenu className="absolute top-1 right-2.5 z-10" />
                                <Panel_Tree />
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        <ResizablePanel id="props" minSize={30}>
                            <Panel_Props />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="report" minSize={12}>
                    <SyncReportPanel />
                </ResizablePanel>
            </ResizablePanelGroup>

            <CheckDetailsDialog />
        </div>
    );
}
