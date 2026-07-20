import { useSnapshot } from "valtio";
import { AlertTriangle, Info, Menu } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import {
    copyEditorStore,
    CopyConfig_Apply,
    CopyConfig_Export,
    CopyConfig_Import,
    CopyConfig_Load,
    CopyConfig_ResetToDefaults,
} from "@/components/2-main/5-tab-copy-operations/a-atoms/0-copy-local-storage";

export function TopBar() {
    return (
        <div className="bg-app-background/10">
            <div className="mx-1 h-9 px-2 py-1.5 bg-background border rounded flex items-center gap-2">
                <StatusMessage />

                <div className="ml-auto flex items-center gap-2">
                    <ChangedBadge />
                    <ActionsMenu />
                </div>
            </div>
        </div>
    );
}

function StatusMessage() {
    const { status, error, path } = useSnapshot(copyEditorStore);
    const message = error || status;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "size-5 rounded-full border inline-flex items-center justify-center",
                            error
                                ? "text-destructive border-destructive/70 bg-destructive/15"
                                : "text-muted-foreground border-border bg-muted",
                        )}
                        aria-label="Status"
                    >
                        {error
                            ? <AlertTriangle className="size-3" />
                            : <Info className="size-3" />
                        }
                    </button>
                </TooltipTrigger>

                <TooltipContent side="bottom" className="max-w-80">
                    <div className="flex flex-col gap-1">
                        {message && <p>{message}</p>}
                        <p>
                            {path
                                ? `File: ${path}`
                                : "Edit copy operations and create copy.json"
                            }
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function ChangedBadge() {
    const { dirty } = useSnapshot(copyEditorStore);

    if (!dirty) {
        return null;
    }

    return (
        <span className="px-1.5 text-red-500 dark:text-orange-500 bg-orange-500/30 border border-red-500/70 rounded-full flex items-center justify-center">
            Changed
        </span>
    );
}

function ActionsMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-xs" title="File actions">
                    <Menu />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => CopyConfig_Load()} title="Reload from copy.json">
                    Reload
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => CopyConfig_Import()} title="Import JSON file">
                    Import…
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => CopyConfig_Export()} title="Export as JSON">
                    Export…
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={() => CopyConfig_ResetToDefaults()} title="Restore defaults">
                    Reset
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => CopyConfig_Apply()} title="Save copy.json">
                    Apply
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
