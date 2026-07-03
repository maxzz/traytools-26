import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { AlertTriangle, RotateCcw, RefreshCw, Save } from "lucide-react";
import { loadToolsConfig, resetToDefaults, saveToolsConfig, toolsEditor } from "@/store/5-tools-editor";
import { Button } from "@/ui/shadcn/button";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { ToolsNodeList } from "./1-tools-node-editor";

// Tools Menu editor. Lets the user edit the "Tools" menu tree and write it to
// tools.json with a single button. The tree is loaded from the on-disk file
// (same location the menu reads), or from the localStorage copy when the file
// is missing. Defaults mirror the shipped tools/tools.json.

export function PageToolsEditor() {
    const snap = useSnapshot(toolsEditor);

    useEffect(
        () => {
            loadToolsConfig();
        },
        []);

    const rootItems = toolsEditor.config.menu.menuItems ??= [];

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-card border rounded-md overflow-hidden">

            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <div className="mr-auto flex flex-col">
                    <span className="text-sm font-medium">Tools Menu Editor</span>
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
                    <Save /> Save tools.json
                </Button>
            </div>

            {(snap.status || snap.error || snap.dirty) && (
                <div className="flex items-center gap-2 border-b px-3 py-1 text-[0.72rem]">
                    {snap.error
                        ? <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="size-3.5" /> {snap.error}</span>
                        : <span className="text-muted-foreground">{snap.status}</span>}
                    {snap.dirty && <span className="ml-auto rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-600 dark:text-amber-400">Unsaved changes</span>}
                </div>
            )}

            <ScrollArea className="min-h-0 flex-1">
                <div className="p-3">
                    <ToolsNodeList items={rootItems} />
                </div>
            </ScrollArea>
        </div>
    );
}
