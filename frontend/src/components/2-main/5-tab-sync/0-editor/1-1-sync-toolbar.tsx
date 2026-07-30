import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { AlertTriangle, Info, Menu } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { useCtrlSSave, useSaveNotice } from "../../a-shared/use-editor-ctrl-s";
import { syncEditorStore, SyncConfig_Apply, SyncConfig_CreateNew, SyncConfig_Export, SyncConfig_Import, SyncConfig_Load, SyncConfig_RevealInExplorer } from "../a-atoms/0-sync-local-storage";
import { folderBaseName } from "../a-atoms/9-types-sync";

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
                <CurrentFileInfo saveNotice={saveNotice.message} />

                <div className="ml-auto flex items-center gap-2">
                    <ChangedBadge />
                    <ActionsMenu />
                </div>
            </div>
        </div>
    );
}

function CurrentFileInfo({ saveNotice }: { saveNotice: string; }) {
    const snap = useSnapshot(syncEditorStore);
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

    if (source === "import" && path) {
        const label = folderBaseName(path);
        return {
            label,
            detail: path,
            aria: `Imported file: ${path}`,
        };
    }

    if (fileExists && path) {
        const label = folderBaseName(path);
        return {
            label,
            detail: path,
            aria: `Working file: ${path}`,
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

function ChangedBadge() {
    const { dirty } = useSnapshot(syncEditorStore);

    if (!dirty) {
        return null;
    }

    return (
        <span className="px-1.5 text-red-500 bg-orange-500/30 dark:text-orange-500 border border-red-500/70 rounded-full flex items-center justify-center">
            Changed
        </span>
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
