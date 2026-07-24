import { useSnapshot } from "valtio";
import { AlertTriangle, Info, Menu } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { useCtrlSSave, useSaveNotice } from "../../a-shared/use-editor-ctrl-s";
import {
    toolsEditorStore,
    ToolsConfig_Apply,
    ToolsConfig_Load,
    ToolsConfig_ResetToDefaults,
    ToolsConfig_RevealInExplorer,
} from "../a-atoms/0-menu-local-storage";

export function TopBar() {
    const saveNotice = useSaveNotice();

    useCtrlSSave(
        async () => {
            if (!toolsEditorStore.dirty) {
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
    const { status, error, path, fileExists } = useSnapshot(toolsEditorStore);
    const message = error || status;
    const fileLabel = path
        ? path.replace(/\//g, "\\").split("\\").pop() || path
        : (fileExists ? "tools.json" : "Local storage");
    const fileDetail = path || "Edit the Tools menu and create tools.json";

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
                            <p>{fileDetail}</p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <span className="text-xs text-muted-foreground truncate" title={fileDetail}>
                {fileLabel}
            </span>

            {saveNotice && (
                <span
                    className={cn(
                        "text-xs shrink-0",
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
