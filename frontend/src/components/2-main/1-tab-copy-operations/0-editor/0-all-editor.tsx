import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS, savePanelLayout } from "@/store/2-panel-sizes";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { CopyConfig_Load } from "@/components/2-main/1-tab-copy-operations/a-atoms/0-copy-local-storage";
import { Panel_Tree } from "./2-0-panel-tree";
import { Panel_Props } from "./3-0-panel-props";
import { TopBar } from "./1-1-top-bar";
import { TreeViewMenu } from "./2-1-tree-menu";
import { CopyStatusDialog } from "./4-copy-status-dialog";
import { initCopyPathDropListener } from "./path-input";

export function Page_CopyOperations() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.copyEditorMain];

    useEffect(
        () => {
            initCopyPathDropListener();
            CopyConfig_Load();
        },
        []);

    return (
        <div className="flex-1 size-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr] gap-0.5">
            <TopBar />

            <ResizablePanelGroup className="bg-card" orientation="horizontal" defaultLayout={mainLayout as Layout} onLayoutChanged={(layout) => savePanelLayout(PANEL_GROUPS.copyEditorMain, layout)}>
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

            <CopyStatusDialog />
        </div>
    );
}
