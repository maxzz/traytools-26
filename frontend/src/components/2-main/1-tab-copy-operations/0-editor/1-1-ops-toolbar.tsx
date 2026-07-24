import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { AlertTriangle, Info, Menu } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { copyEditorStore, CopyConfig_Apply, CopyConfig_CreateNew, CopyConfig_Export, CopyConfig_Import, CopyConfig_Load, CopyConfig_RevealInExplorer } from "../a-atoms/0-copy-local-storage";
import { sourceFileBaseName } from "../a-atoms/9-types-copy";

export function CopyOperationsToolbar() {
    return (
        <div className="bg-app-background/10">
            <div className="mx-1 px-2 py-1.5 h-9 bg-background border rounded flex items-center gap-2">
                <CurrentFileInfo />

                <div className="ml-auto flex items-center gap-2">
                    <ChangedBadge />
                    <ActionsMenu />
                </div>
            </div>
        </div>
    );
}

function CurrentFileInfo() {
    const snap = useSnapshot(copyEditorStore);
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
                                "size-5 shrink-0 border rounded-full inline-flex items-center justify-center",
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
        const label = sourceFileBaseName(path);
        return {
            label,
            detail: path,
            aria: `Imported file: ${path}`,
        };
    }

    if (fileExists && path) {
        const label = sourceFileBaseName(path);
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
    const { dirty } = useSnapshot(copyEditorStore);

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
    const { dirty, fileExists, path, source } = useSnapshot(copyEditorStore);

    // New unsaved config (Create new) — local storage only, no disk file yet.
    const alreadyNew = source === "default" && !fileExists;
    // Save: dirty edits, or first persist when nothing is on disk yet (incl. import → managed file).
    const canSave = dirty || !fileExists;
    // Reveal: managed copy.json, or the imported source file.
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
                    title={canSave ? "Save copy.json" : "Nothing to save"}
                    disabled={!canSave}
                    onSelect={() => canSave && CopyConfig_Apply()}
                >
                    Save
                </DropdownMenuItem>

                <DropdownMenuItem
                    title={canReveal ? "Show working file in File Explorer" : "No file on disk yet — save copy.json first"}
                    disabled={!canReveal}
                    onSelect={() => canReveal && void CopyConfig_RevealInExplorer()}
                >
                    Reveal in File Explorer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    title={alreadyNew ? "Already editing a new unsaved configuration" : "Start a new configuration (local storage until Save)"}
                    disabled={alreadyNew}
                    onSelect={() => !alreadyNew && CopyConfig_CreateNew()}
                >
                    Create new…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => CopyConfig_Import()} title="Import JSON file">
                    Import…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => CopyConfig_Export()} title="Export as JSON">
                    Export…
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    title={canReload ? "Reload from copy.json" : "No copy.json on disk yet — nothing to reload"}
                    disabled={!canReload}
                    onSelect={() => canReload && CopyConfig_Load({ notify: true })}
                >
                    Reload
                </DropdownMenuItem>

            </DropdownMenuContent>
        </DropdownMenu>
    );
}
