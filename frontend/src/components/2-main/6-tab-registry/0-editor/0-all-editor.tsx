import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { type Layout } from "react-resizable-panels";
import { PANEL_GROUPS, savePanelLayout } from "@/store/2-panel-sizes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { initPathDropListener } from "@/components/2-main/a-shared/path-input";
import { Panel_Tree } from "./2-0-panel-tree";
import { Panel_Props } from "./3-0-panel-props";
import { RegistryToolbar } from "./1-1-registry-toolbar";
import { TreeViewMenu } from "./2-1-tree-menu";
import { RegistryReportPanel } from "./4-0-report-registry";
import { RegistryConfig_Load } from "../a-atoms/0-registry-local-storage";

export function Page_Registry() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.registryEditorMain];
    const verticalLayout = panelSizes[PANEL_GROUPS.registryEditorVertical];

    useEffect(
        () => {
            initPathDropListener();
            RegistryConfig_Load();
        },
        []);

    return (
        <div className="flex-1 size-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr] gap-0.5">
            <RegistryToolbar />

            <ResizablePanelGroup
                className="bg-card"
                orientation="vertical"
                defaultLayout={verticalLayout as Layout}
                onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.registryEditorVertical, layout)}
            >
                <ResizablePanel id="editor" minSize={30}>
                    <ResizablePanelGroup
                        className="size-full"
                        orientation="horizontal"
                        defaultLayout={mainLayout as Layout}
                        onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.registryEditorMain, layout)}
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
                    <RegistryReportPanel />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
