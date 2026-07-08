import { useSnapshot } from "valtio";
import { AlertTriangle, RotateCcw, RefreshCw, Save } from "lucide-react";
import { loadToolsConfig, resetToDefaults, saveToolsConfig, toolsEditor } from "@/components/2-main/3-tab-tools-menu-editor/a-menu-editor-atoms";
import { Button } from "@/ui/shadcn/button";

export function ToolsEditorFooter() {
    const snap = useSnapshot(toolsEditor);

    return (
        <>
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
        </>
    );
}
