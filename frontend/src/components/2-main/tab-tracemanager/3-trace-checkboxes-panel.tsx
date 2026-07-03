import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/utils";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/shadcn/collapsible";
import { traceManagerBus, type SectionDescription } from "@/bridge";
import { traceStore, setSections, toggleCategory } from "@/store/3-trace-manager";
import { expandedSectionsAtom } from "./a-trace-manager-atoms";

// Right pane: the debug categories editor. Port of the legacy
// CTraceCheckboxesCtrl — grouped checkboxes plus the Load/Save/Export/Import and
// registry jump buttons.
export function TraceCheckboxesPanel() {
    const snap = useSnapshot(traceStore);
    const [expanded, setExpanded] = useAtom(expandedSectionsAtom);

    const load = async () => {
        traceStore.categoriesLoading = true;
        traceStore.categoriesError = null;
        try {
            const sections = await traceManagerBus.getCategories();
            setSections(sections ?? []);
            // Auto-expand everything the first time we have data.
            setExpanded((sections ?? []).map((s) => s.sectionName));
        } catch (e) {
            traceStore.categoriesError = String(e);
        } finally {
            traceStore.categoriesLoading = false;
        }
    };

    const save = async () => {
        traceStore.categoriesError = null;
        try {
            const payload: SectionDescription[] = JSON.parse(JSON.stringify(traceStore.sections));
            const sections = await traceManagerBus.saveCategories(payload);
            setSections(sections ?? payload);
        } catch (e) {
            traceStore.categoriesError = String(e);
        }
    };

    const runAction = async (fn: () => Promise<unknown>) => {
        traceStore.categoriesError = null;
        try {
            await fn();
        } catch (e) {
            traceStore.categoriesError = String(e);
        }
    };

    const toggleSection = (name: string, open: boolean) => {
        setExpanded(open ? [...expanded, name] : expanded.filter((n) => n !== name));
    };

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="px-2 py-1.5 border-b flex items-center gap-2">
                <span className="text-xs font-semibold">Trace categories</span>
                {snap.categoriesDirty && <span className="text-[10px] text-amber-600 dark:text-amber-400">unsaved</span>}
                <div className="ml-auto flex items-center gap-1">
                    <Button size="xs" variant="outline" onClick={load} disabled={snap.categoriesLoading}>
                        {snap.categoriesLoading ? "Loading…" : "Load"}
                    </Button>
                    <Button size="xs" variant="default" onClick={save} disabled={snap.sections.length === 0}>Save</Button>
                </div>
            </div>

            <div className="px-2 py-1.5 border-b flex flex-wrap items-center gap-1">
                <Button size="xs" variant="ghost" onClick={() => runAction(traceManagerBus.exportTrace)}>Export</Button>
                <Button size="xs" variant="ghost" onClick={() => runAction(traceManagerBus.importTrace)}>Import</Button>
                <span className="mx-1 w-px h-4 bg-border" />
                <Button size="xs" variant="ghost" onClick={() => runAction(() => traceManagerBus.openRegedit("user"))}>Reg User</Button>
                <Button size="xs" variant="ghost" onClick={() => runAction(() => traceManagerBus.openRegedit("tracing"))}>Dp Reg</Button>
            </div>

            {snap.categoriesError && (
                <div className="px-2 py-1.5 text-[11px] text-destructive bg-destructive/5 border-b">{snap.categoriesError}</div>
            )}

            <ScrollArea className="flex-1 min-h-0">
                {snap.sections.length === 0
                    ? <div className="p-3 text-xs text-muted-foreground">Press <span className="font-medium">Load</span> to read the debug categories.</div>
                    : (
                        <div className="py-1">
                            {snap.sections.map((section) => {
                                const open = expanded.includes(section.sectionName);
                                return (
                                    <Collapsible key={section.sectionName} open={open} onOpenChange={(v) => toggleSection(section.sectionName, v)}>
                                        <CollapsibleTrigger className="px-2 py-1 w-full text-xs font-medium hover:bg-muted/50 flex items-center gap-1">
                                            <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
                                            <span className="truncate">{section.sectionName}</span>
                                            <span className="ml-auto text-muted-foreground">{section.items.length}</span>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="pl-4 pr-2 py-0.5 flex flex-col gap-0.5">
                                                {section.items.map((item) => (
                                                    <label key={item.memId} className="py-0.5 px-1 text-xs hover:bg-muted/30 rounded-sm flex items-start gap-2 cursor-pointer">
                                                        <Checkbox
                                                            className="mt-0.5"
                                                            checked={item.active}
                                                            onCheckedChange={(v) => toggleCategory(section.sectionName, item.memId, v === true)}
                                                        />
                                                        <span className="leading-snug">
                                                            <span className="mr-1 font-mono text-muted-foreground">[{item.bit.toString(16).padStart(2, "0")}]</span>
                                                            {item.description}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
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
