import { useSnapshot } from "valtio";
import { Menu } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
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
                {saveNotice.message && (
                    <span
                        className={cn(
                            "min-w-0 text-xs truncate",
                            saveNotice.message === "saved"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground",
                        )}
                    >
                        {saveNotice.message}
                    </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                    <ActionsMenu />
                </div>
            </div>
        </div>
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
