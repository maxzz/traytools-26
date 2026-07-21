import { useSnapshot } from "valtio";
import { AlertTriangle, Info, Menu } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import {
    toolsEditorStore,
    ToolsConfig_Apply,
    ToolsConfig_Load,
    ToolsConfig_ResetToDefaults,
    ToolsConfig_RevealInExplorer,
} from "../a-atoms/0-menu-local-storage";

export function TopBar() {
    return (
        <div className="bg-app-background/10">
            <div className="mx-1 h-9 px-2 py-1.5 bg-background border rounded flex items-center gap-2">
                <StatusMessage />

                <div className="ml-auto flex items-center gap-2">
                    <DirtyStatusBadge />
                    <ActionsMenu />
                </div>
            </div>
        </div>
    );
}

function StatusMessage() {
    const { status, error, path } = useSnapshot(toolsEditorStore);
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
                                : "Edit the Tools menu and create tools.json"
                            }
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
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

function ActionsMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-xs" title="File actions">
                    <Menu />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => ToolsConfig_Load()} title="Reload from tools.json">
                    {/* <RefreshCw />  */}
                    Reload
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => void ToolsConfig_RevealInExplorer()} title="Show tools.json in File Explorer">
                    Reveal in File Explorer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={() => ToolsConfig_ResetToDefaults()} title="Restore default tools">
                    {/* <RotateCcw />  */}
                    Reset
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => ToolsConfig_Apply()} title="Save tools.json and apply hotkeys">
                    {/* <Check />  */}
                    Apply
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
