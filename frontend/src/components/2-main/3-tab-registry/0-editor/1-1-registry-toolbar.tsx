import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { Menu } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { useCtrlSSave, useSaveNotice } from "../../a-shared/use-editor-ctrl-s";
import {
    RegistryConfig_Apply,
    RegistryConfig_CreateNew,
    RegistryConfig_Export,
    RegistryConfig_ExportReg,
    RegistryConfig_Import,
    RegistryConfig_Load,
    RegistryConfig_RevealInExplorer,
    registryEditorStore,
} from "../a-atoms/0-registry-local-storage";
import { RegistryImportFileAsGroup } from "../a-atoms/1-registry-editor-atoms";

export function RegistryToolbar() {
    const saveNotice = useSaveNotice();

    useCtrlSSave(
        async () => {
            if (!registryEditorStore.dirty) {
                saveNotice.show("no changes to save");
                return;
            }
            await RegistryConfig_Apply();
            if (!registryEditorStore.dirty && !registryEditorStore.error) {
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
    const { dirty, fileExists, path, source } = useSnapshot(registryEditorStore);

    // New unsaved config (Create new) — local storage only, no disk file yet.
    const alreadyNew = source === "default" && !fileExists;
    // Save: dirty edits, or first persist when nothing is on disk yet (incl. import → managed file).
    const canSave = dirty || !fileExists;
    // Reveal: managed registry.json, or the imported source file.
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
                    title={canSave ? "Save registry.json" : "Nothing to save"}
                    disabled={!canSave}
                    onSelect={() => canSave && RegistryConfig_Apply()}
                >
                    Save
                    <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
                </DropdownMenuItem>

                <DropdownMenuItem
                    title={canReveal ? "Show working file in File Explorer" : "No file on disk yet — save registry.json first"}
                    disabled={!canReveal}
                    onSelect={() => canReveal && void RegistryConfig_RevealInExplorer()}
                >
                    Reveal in File Explorer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    title={alreadyNew ? "Already editing a new unsaved configuration" : "Start a new configuration (local storage until Save)"}
                    disabled={alreadyNew}
                    onSelect={() => !alreadyNew && RegistryConfig_CreateNew()}
                >
                    Create new…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => RegistryConfig_Import()} title="Replace the tree with a JSON configuration file">
                    Import JSON…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => void RegistryImportFileAsGroup()} title="Add a Windows .reg file to the tree as a new group">
                    Import .reg as group…
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={() => RegistryConfig_Export()} title="Export the selected group as JSON (whole tree when Groups is selected)">
                    Export JSON…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => RegistryConfig_ExportReg()} title="Export the selected group's values as a Windows .reg file (whole tree when Groups is selected)">
                    Export .reg…
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    title={canReload ? "Reload from registry.json" : "No registry.json on disk yet — nothing to reload"}
                    disabled={!canReload}
                    onSelect={() => canReload && RegistryConfig_Load({ notify: true })}
                >
                    Reload
                </DropdownMenuItem>

            </DropdownMenuContent>
        </DropdownMenu>
    );
}
