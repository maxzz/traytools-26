import { useSnapshot } from "valtio";
import { AlertTriangle, RotateCcw, RefreshCw, Check } from "lucide-react";
import { toolsEditorStore, loadToolsConfig, resetToDefaults, applyToolsConfig } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { Button } from "@/ui/shadcn/button";

export function TopBar() {
    return (
        <div className="mx-1 my-1 px-2 py-2 bg-background border rounded flex items-center gap-2">
            <StatusMessage />
            <FilePathLabel />

            <DirtyStatusBadge />

            <Button variant="outline" size="sm" onClick={() => loadToolsConfig()} title="Reload from tools.json">
                <RefreshCw /> Reload
            </Button>

            <Button variant="outline" size="sm" onClick={() => resetToDefaults()} title="Restore default tools">
                <RotateCcw /> Reset
            </Button>

            <Button variant="outline" size="sm" onClick={() => applyToolsConfig()} title="Save tools.json and apply hotkeys">
                <Check /> Apply
            </Button>
        </div>
    );
}

function FilePathLabel() {
    const { path } = useSnapshot(toolsEditorStore);

    return (
        <div className="mr-auto flex flex-col">
            <span className="text-[0.7rem] text-muted-foreground">
                {path
                    ? (<>
                        File: <span className="">{path}</span>
                    </>)
                    : "Edit the Tools menu and create tools.json"
                }
            </span>
        </div>
    );
}

function StatusMessage() {
    const { status, error } = useSnapshot(toolsEditorStore);

    if (error) {
        return (
            <span className="text-destructive flex items-center gap-1">
                <AlertTriangle className="size-3.5" /> {error}
            </span>
        );
    }

    if (!status) {
        return null;
    }

    return (
        <span className="text-muted-foreground">
            {status}
        </span>
    );
}

function DirtyStatusBadge() {
    const { dirty } = useSnapshot(toolsEditorStore);

    if (!dirty) {
        return null;
    }

    return (
        <span className="px-1.5 text-red-500 dark:text-orange-500 bg-orange-500/30 border border-red-500/70 rounded-full flex items-center justify-center">
            unsaved
        </span>
    );
}
