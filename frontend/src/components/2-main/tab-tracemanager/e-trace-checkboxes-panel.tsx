import { useEffect } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import {
    ChevronRight,
    Download,
    FileDown,
    FileUp,
    FolderTree,
    RefreshCw,
    Save,
    ScrollText,
    Users,
} from "lucide-react";
import { traceManagerStore, traceManagerActions } from "@/store/3-trace-manager";
import { expandedSectionsAtom } from "./a-trace-manager-atoms";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/shadcn/collapsible";
import { cn } from "@/utils";

// Right pane of the Trace Manager: the debug-categories editor. This is the
// port of the legacy CTraceCheckboxesCtrl — a listview of checkboxes grouped
// by DP component section, plus the Load/Save/Export/Import and regedit
// actions.
export function TraceCheckboxesPanel() {
    const snap = useSnapshot(traceManagerStore);
    const [expanded, setExpanded] = useAtom(expandedSectionsAtom);

    // Load categories on first mount, mirroring OnInitDialog's loadtolistview().
    useEffect(() => {
        traceManagerActions.loadCategories();
    }, []);

    const toggleSection = (name: string) =>
        setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

    return (
        <div className="flex flex-col min-h-0 h-full">
            <Toolbar />

            {snap.error && (
                <div className="px-2 py-1.5 text-[0.65rem] text-destructive bg-destructive/10 border-b border-destructive/20 break-all flex items-start gap-2">
                    <span className="flex-1">{snap.error}</span>
                    <button
                        className="text-destructive/70 hover:text-destructive shrink-0"
                        onClick={() => traceManagerActions.clearError()}
                    >
                        ✕
                    </button>
                </div>
            )}

            <ScrollArea className="flex-1 min-h-0" fullHeight>
                {snap.categories.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                        {snap.categoriesLoading
                            ? "Loading categories…"
                            : "No categories. Press Load to read from the registry."}
                    </div>
                ) : (
                    <div className="py-1">
                        {snap.categories.map((section, si) => {
                            const isOpen = expanded[section.sectionName] ?? true;
                            const activeCount = section.stringDescriptions.filter((d) => d.active).length;
                            return (
                                <Collapsible key={section.sectionName} open={isOpen} onOpenChange={() => toggleSection(section.sectionName)}>
                                    <CollapsibleTrigger asChild>
                                        <button className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-muted/40">
                                            <ChevronRight
                                                className={cn("size-3.5 transition-transform", isOpen && "rotate-90")}
                                            />
                                            <span className="font-medium truncate">{section.sectionName}</span>
                                            <span className="ml-auto text-[0.6rem] text-muted-foreground tabular-nums">
                                                {activeCount}/{section.stringDescriptions.length}
                                            </span>
                                        </button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <ul className="pl-6 pr-2 pb-1.5">
                                            {section.stringDescriptions.map((desc) => (
                                                <li key={desc.memId} className="flex items-center gap-2 py-0.5">
                                                    <Checkbox
                                                        checked={desc.active}
                                                        onCheckedChange={(v) =>
                                                            traceManagerActions.setCategoryActive(si, desc.memId, v === true)
                                                        }
                                                    />
                                                    <span className="text-xs text-muted-foreground select-none">
                                                        {desc.description}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

function Toolbar() {
    const snap = useSnapshot(traceManagerStore);

    return (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b bg-muted/20">
            <Button
                size="xs"
                variant="outline"
                disabled={snap.categoriesLoading}
                onClick={() => traceManagerActions.loadCategories()}
                title="Read categories from the registry"
            >
                <RefreshCw className={cn("size-3", snap.categoriesLoading && "animate-spin")} />
                Load
            </Button>
            <Button
                size="xs"
                variant="outline"
                disabled={snap.categoriesSaving}
                onClick={() => traceManagerActions.saveCategories()}
                title="Write categories to the registry"
            >
                <Save className="size-3" />
                Save
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            <Button size="xs" variant="ghost" onClick={() => traceManagerActions.exportTrace()} title="Export trace text via dpocache.dll and open in notepad">
                <FileDown className="size-3" />
                Export
            </Button>
            <Button size="xs" variant="ghost" onClick={() => traceManagerActions.importTrace()} title="Import trace text via dpocache.dll">
                <FileUp className="size-3" />
                Import
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            <Button size="xs" variant="ghost" disabled title="Create DP registry keys (not implemented)">
                <FolderTree className="size-3" />
                Reg Keys
            </Button>
            <Button
                size="xs"
                variant="ghost"
                onClick={() => traceManagerActions.openRegedit("HKCU\\SOFTWARE\\DigitalPersona\\Applications\\OTS")}
                title="Open regedit at HKCU\\…\\Applications\\OTS"
            >
                <Users className="size-3" />
                Reg User
            </Button>
            <Button
                size="xs"
                variant="ghost"
                onClick={() => traceManagerActions.openRegedit("HKLM\\SOFTWARE\\DigitalPersona\\Tracing")}
                title="Open regedit at HKLM\\…\\Tracing"
            >
                <ScrollText className="size-3" />
                Dp Reg
            </Button>

            <span className="ml-auto flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                <Download className="size-3" />
                {snap.categories.length} sections
            </span>
        </div>
    );
}
