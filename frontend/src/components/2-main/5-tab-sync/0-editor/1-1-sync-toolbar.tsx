import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { Menu } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { useCtrlSSave, useSaveNotice } from "../../a-shared/use-editor-ctrl-s";
import { syncEditorStore, SyncConfig_Apply, SyncConfig_CreateNew, SyncConfig_Export, SyncConfig_Import, SyncConfig_Load, SyncConfig_RevealInExplorer } from "../a-atoms/0-sync-local-storage";

export function SyncOperationsToolbar() {
    const saveNotice = useSaveNotice();

    useCtrlSSave(
        async () => {
            if (!syncEditorStore.dirty) {
                saveNotice.show("no changes to save");
                return;
            }
            await SyncConfig_Apply();
            if (!syncEditorStore.dirty && !syncEditorStore.error) {
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
    const { dirty, fileExists, path, source } = useSnapshot(syncEditorStore);

    // New unsaved config (Create new) — local storage only, no disk file yet.
    const alreadyNew = source === "default" && !fileExists;
    // Save: dirty edits, or first persist when nothing is on disk yet (incl. import → managed file).
    const canSave = dirty || !fileExists;
    // Reveal: managed sync.json, or the imported source file.
    const canReveal = Boolean(path) && (fileExists || source === "import");
    // Reload: anything except a brand-new local-only config (may still hit disk / cache).
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
                    title={canSave ? "Save sync.json" : "Nothing to save"}
                    disabled={!canSave}
                    onSelect={() => canSave && SyncConfig_Apply()}
                >
                    Save
                    <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
                </DropdownMenuItem>

                <DropdownMenuItem
                    title={canReveal ? "Show working file in File Explorer" : "No file on disk yet — save sync.json first"}
                    disabled={!canReveal}
                    onSelect={() => canReveal && void SyncConfig_RevealInExplorer()}
                >
                    Reveal in File Explorer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    title={alreadyNew ? "Already editing a new unsaved configuration" : "Start a new configuration (local storage until Save)"}
                    disabled={alreadyNew}
                    onSelect={() => !alreadyNew && SyncConfig_CreateNew()}
                >
                    Create new…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => SyncConfig_Import()} title="Import JSON file">
                    Import…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => SyncConfig_Export()} title="Export as JSON">
                    Export…
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    title={canReload ? "Reload from sync.json" : "No sync.json on disk yet — nothing to reload"}
                    disabled={!canReload}
                    onSelect={() => canReload && SyncConfig_Load({ notify: true })}
                >
                    Reload
                </DropdownMenuItem>

            </DropdownMenuContent>
        </DropdownMenu>
    );
}
