import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { type Layout } from "react-resizable-panels";
import { AlertTriangle, RotateCcw, RefreshCw, Save } from "lucide-react";
import { loadToolsConfig, resetToDefaults, saveToolsConfig, toolsEditor } from "@/store/5-tools-editor";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS } from "@/store/2-panel-sizes";
import { Button } from "@/ui/shadcn/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/ui/shadcn/resizable";
import { ToolsTree } from "./1-tools-tree";
import { ToolsProps } from "./2-tools-props";

// Tools Menu editor. Lets the user edit the "Tools" menu tree and write it to
// tools.json with a single button. The tree (left) is loaded from the on-disk
// file (same location the menu reads), or from the localStorage copy when the
// file is missing. Selecting a node shows its properties on the right. Nodes can
// be reordered / re-nested by drag-and-drop, and added / removed via the toolbar.

export function Page_ToolsMenuEditor() {
    const snap = useSnapshot(toolsEditor);
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.toolsEditorMain];

    const onMainLayoutChanged = (layout: Layout) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, [PANEL_GROUPS.toolsEditorMain]: layout };
    };

    useEffect(
        () => {
            loadToolsConfig();
        },
        []);

    return (
        <div className="flex-1 min-h-0 bg-card border rounded-md overflow-hidden flex flex-col">
            <ResizablePanelGroup orientation="horizontal" defaultLayout={mainLayout as Layout} onLayoutChanged={onMainLayoutChanged}>
                <ResizablePanel id="tree" minSize={22}>
                    <ToolsTree />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="props" minSize={30}>
                    <ToolsProps />
                </ResizablePanel>
            </ResizablePanelGroup>

            {(snap.status || snap.error || snap.dirty || snap.fileExists) && (
                <div className="px-3 py-1 text-[0.72rem] border-t flex items-center gap-2">
                    {snap.error
                        ? <span className="text-destructive flex items-center gap-1"><AlertTriangle className="size-3.5" /> {snap.error}</span>
                        : <span className="text-muted-foreground">{snap.status}</span>}
                    {snap.dirty
                        ? <span className="ml-auto px-1.5 py-0.5 text-amber-600 bg-amber-500/15 dark:text-amber-400 rounded">Unsaved changes</span>
                        : snap.fileExists && <span className="ml-auto px-1.5 py-0.5 text-muted-foreground bg-muted rounded">No unsaved changes</span>}
                </div>
            )}

            <div className="px-3 py-2 bg-muted border-t flex flex-wrap items-center gap-2">
                <div className="mr-auto flex flex-col">
                    <span className="text-[0.7rem] text-muted-foreground">
                        {snap.path
                            ? <>File: <span className="font-mono">{snap.path}</span></>
                            : "Edit the Tools menu and create tools.json"}
                    </span>
                </div>

                <Button variant="outline" size="sm" onClick={() => loadToolsConfig()} title="Reload from tools.json">
                    <RefreshCw /> Reload
                </Button>
                <Button variant="outline" size="sm" onClick={() => resetToDefaults()} title="Restore default tools">
                    <RotateCcw /> Reset
                </Button>
                <Button size="sm" onClick={() => saveToolsConfig()} title="Create/overwrite tools.json">
                    <Save /> Save
                </Button>
            </div>
        </div>
    );
}
