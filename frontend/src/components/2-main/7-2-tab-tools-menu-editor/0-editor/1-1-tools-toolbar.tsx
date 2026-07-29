import { useSnapshot } from "valtio";
import { AlertTriangle, Info, Menu } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { useCtrlSSave, useSaveNotice } from "../../a-shared/use-editor-ctrl-s";
import {
    toolsEditorStore,
    ToolsConfig_Apply,
    ToolsConfig_CreateNew,
    ToolsConfig_Open,
    ToolsConfig_Reload,
    ToolsConfig_RevealInExplorer,
    ToolsConfig_SaveAs,
} from "../a-atoms/0-menu-local-storage";
import { sourceFileBaseName } from "../a-atoms/9-types-menu";

export function TopBar() {
    const saveNotice = useSaveNotice();

    useCtrlSSave(
        async () => {
            if (!toolsEditorStore.dirty && toolsEditorStore.fileExists) {
                saveNotice.show("no changes to save");
                return;
            }
            await ToolsConfig_Apply();
            if (!toolsEditorStore.dirty && !toolsEditorStore.error) {
                saveNotice.show("saved");
            }
        },
    );

    return (
        <div className="bg-app-background/10">
            <div className="mx-1 px-2 py-1.5 h-9 bg-background border rounded flex items-center gap-2">
                <StatusMessage saveNotice={saveNotice.message} />

                <div className="ml-auto flex items-center gap-2">
                    <DirtyStatusBadge />
                    <ActionsMenu />
                </div>
            </div>
        </div>
    );
}

function StatusMessage({ saveNotice }: { saveNotice: string; }) {
    const snap = useSnapshot(toolsEditorStore);
    const { error } = snap;
    const working = workingFileCaption(snap);

    return (
        <div className="min-w-0 flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "shrink-0 size-5 border rounded-full inline-flex items-center justify-center",
                                error
                                    ? "text-destructive border-destructive/70 bg-destructive/15"
                                    : "text-muted-foreground border-border bg-muted",
                            )}
                            aria-label={working.aria}
                        >
                            {error
                                ? <AlertTriangle className="size-3" />
                                : <Info className="size-3" />
                            }
                        </button>
                    </TooltipTrigger>

                    <TooltipContent side="bottom" className="max-w-80">
                        <div className="flex flex-col gap-1">
                            {error && <p>{error}</p>}
                            <p>{working.detail}</p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <span className="text-xs text-muted-foreground truncate" title={working.detail}>
                {working.label}
            </span>

            {saveNotice && (
                <span
                    className={cn(
                        "shrink-0 text-xs",
                        saveNotice === "saved"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground",
                    )}
                >
                    {saveNotice}
                </span>
            )}
        </div>
    );
}

function workingFileCaption(snap: {
    path: string;
    source: string;
    fileExists: boolean;
}): { label: string; detail: string; aria: string; } {
    const { path, source, fileExists } = snap;

    if (fileExists && path) {
        const label = sourceFileBaseName(path);
        return {
            label,
            detail: path,
            aria: source === "open" ? `Opened file: ${path}` : `Working file: ${path}`,
        };
    }

    if (source === "default") {
        const detail = "New configuration — stored in local storage until you Save.";
        return {
            label: "New (local storage)",
            detail,
            aria: detail,
        };
    }

    const detail = path
        ? `No file on disk yet (expected ${path}). Stored in local storage until you Save.`
        : "Stored in local storage until you Save.";
    return {
        label: "Local storage",
        detail,
        aria: detail,
    };
}

function DirtyStatusBadge() {
    const { dirty } = useSnapshot(toolsEditorStore);

    if (!dirty) {
        return null;
    }

    return (
        <span className="px-1.5 text-red-500 bg-orange-500/30 dark:text-orange-500 border border-red-500/70 rounded-full flex items-center justify-center">
            unsaved
        </span>
    );
}

function ActionsMenu() {
    const { dirty, fileExists, path, source } = useSnapshot(toolsEditorStore);

    const alreadyNew = source === "default" && !fileExists;
    const canSave = dirty || !fileExists;
    const canReveal = Boolean(path) && fileExists;
    const canReload = !alreadyNew;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-xs" title="File actions">
                    <Menu />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    title={canSave ? "Save and apply hotkeys when editing tools.json" : "Nothing to save"}
                    disabled={!canSave}
                    onSelect={() => canSave && void ToolsConfig_Apply()}
                >
                    Save
                    <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
                </DropdownMenuItem>

                <DropdownMenuItem
                    title="Save under a new name and switch to that file"
                    onSelect={() => void ToolsConfig_SaveAs()}
                >
                    Save As…
                </DropdownMenuItem>

                <DropdownMenuItem
                    title={
                        canReveal
                            ? `Reveal "${sourceFileBaseName(path)}" in File Explorer`
                            : "No file on disk yet — save first"
                    }
                    disabled={!canReveal}
                    onSelect={() => canReveal && void ToolsConfig_RevealInExplorer()}
                >
                    Reveal in File Explorer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    title={alreadyNew ? "Already editing a new unsaved configuration" : "Start a new configuration (local storage until Save)"}
                    disabled={alreadyNew}
                    onSelect={() => !alreadyNew && ToolsConfig_CreateNew()}
                >
                    Create New…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => void ToolsConfig_Open()} title="Open a JSON tools menu file">
                    Open…
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    title={canReload ? "Reload from the working file" : "Nothing to reload yet"}
                    disabled={!canReload}
                    onSelect={() => canReload && void ToolsConfig_Reload()}
                >
                    Reload
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
