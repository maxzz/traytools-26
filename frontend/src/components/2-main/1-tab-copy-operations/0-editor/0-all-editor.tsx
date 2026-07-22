import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { type Layout } from "react-resizable-panels";
import { PANEL_GROUPS, savePanelLayout } from "@/store/2-panel-sizes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { Panel_Tree } from "./2-0-panel-tree";
import { Panel_Props } from "./3-0-panel-props";
import { CopyOperationsToolbar } from "./1-1-ops-toolbar";
import { TreeViewMenu } from "./2-1-tree-menu";
import { CopyReportPanel } from "./4-copy-report-panel";
import { initCopyPathDropListener } from "./3-2-path-input";
import { CopyConfig_Load } from "../a-atoms/0-copy-local-storage";

export function Page_CopyOperations() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.copyEditorMain];
    const verticalLayout = panelSizes[PANEL_GROUPS.copyEditorVertical];

    useEffect(
        () => {
            initCopyPathDropListener();
            CopyConfig_Load();
        },
        []);

    return (
        <div className="flex-1 size-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr] gap-0.5">
            <CopyOperationsToolbar />

            <ResizablePanelGroup
                className="bg-card"
                orientation="vertical"
                defaultLayout={verticalLayout as Layout}
                onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.copyEditorVertical, layout)}
            >
                <ResizablePanel id="editor" minSize={30}>
                    <ResizablePanelGroup
                        className="size-full"
                        orientation="horizontal"
                        defaultLayout={mainLayout as Layout}
                        onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.copyEditorMain, layout)}
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
                    <CopyReportPanel />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
