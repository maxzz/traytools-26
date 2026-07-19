import { useSnapshot } from "valtio";
import { AlertTriangle, RotateCcw, RefreshCw, Check } from "lucide-react";
import { toolsEditorStore, loadToolsConfig, resetToDefaults, applyToolsConfig } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { Button } from "@/ui/shadcn/button";

export function TopBar() {
    return (
        <div className="mx-2 my-1 px-2 py-2 bg-background border rounded-md flex items-center gap-2">
            <DirtyStatusBadge />
            <StatusMessage />
            <FilePathLabel />

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
    const { dirty, fileExists } = useSnapshot(toolsEditorStore);

    if (dirty) {
        return (
            <span className="ml-auto px-1.5 py-0.5 text-amber-600 bg-amber-500/15 dark:text-amber-400 rounded">
                Unsaved changes
            </span>
        );
    }

    if (!fileExists) {
        return null;
    }

    return (
        <span className="ml-auto px-1.5 py-0.5 text-muted-foreground bg-muted rounded">
            No unsaved changes
        </span>
    );
}
