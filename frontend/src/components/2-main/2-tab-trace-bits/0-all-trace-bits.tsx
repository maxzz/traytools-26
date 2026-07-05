import { useEffect, useLayoutEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { type Layout, type LayoutChangedMeta, usePanelRef } from "react-resizable-panels";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";
import { cn } from "@/utils";
import { traceManagerBus, onWailsEvent, TRACE_EVENTS, type TraceCall } from "@/bridge";
import { routeTraceCall, setStreaming, setSections } from "@/store/3-trace-manager";
import { PANEL_GROUPS } from "@/store/2-panel-sizes";
import { expandedSectionsAtom, showCategoriesAtom } from "./a-trace-manager-atoms";
import { TraceWindowsList } from "./1-trace-windows-list";
import { TraceWindowView } from "./2-trace-window-view";
import { TraceCheckboxesPanel } from "./3-trace-checkboxes-panel";

const PANEL_ANIMATION_MS = 300;

// Trace Manager tab. Reproduces the legacy CTraceManagerDlg layout inside a
// single tab: a resizable [ trace panels | categories ] split, with the trace
// panels column itself split into the per-process list (top) and the selected
// window's trace view (bottom).

export function Page_TraceBits() {
    const { panelSizes } = useSnapshot(appSettings);
    const mainLayout = panelSizes[PANEL_GROUPS.traceManagerMain];
    const leftLayout = panelSizes[PANEL_GROUPS.traceManagerLeft];
    const setExpanded = useSetAtom(expandedSectionsAtom);
    const [showCategories] = useAtom(showCategoriesAtom);
    const categoriesPanelRef = usePanelRef();
    const [isResizing, setIsResizing] = useState(false);

    const panelTransition = !isResizing && "transition-[flex-grow] duration-300 ease-in-out";

    const onMainLayoutChanged = (layout: Layout, meta: LayoutChangedMeta) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, [PANEL_GROUPS.traceManagerMain]: layout };
        if (meta.isUserInteraction) {
            setIsResizing(false);
        }
    };

    const onMainLayoutChanging = () => {
        setIsResizing(true);
    };

    const onLeftLayoutChanged = (layout: Layout) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, [PANEL_GROUPS.traceManagerLeft]: layout };
    };

    // Keep the categories panel in sync with the toolbar toggle.
    useLayoutEffect(() => {
        const panel = categoriesPanelRef.current;
        if (!panel) {
            return;
        }

        if (showCategories) {
            if (panel.isCollapsed()) {
                panel.expand();
            }
        } else if (!panel.isCollapsed()) {
            panel.collapse();
        }
    }, [showCategories, categoriesPanelRef]);

    // Subscribe to backend trace events and load the initial state once.
    useEffect(
        () => {
            const offCall = onWailsEvent<TraceCall>(TRACE_EVENTS.traceCall, routeTraceCall);
            const offStreaming = onWailsEvent<boolean>(TRACE_EVENTS.streaming, setStreaming);

            (async () => {
                try {
                    const status = await traceManagerBus.getStatus();
                    setStreaming(status?.streaming ?? false);
                } catch {
                    /* backend not ready */
                }
                try {
                    const sections = await traceManagerBus.getCategories();
                    setSections(sections ?? []);
                    setExpanded((sections ?? []).map((s) => s.sectionName));
                } catch {
                    /* categories unavailable */
                }
            })();

            return () => {
                offCall();
                offStreaming();
            };
        },
        [setExpanded]);

    return (
        <div className="flex-1 min-h-0 bg-card border rounded-md overflow-hidden">
            <ResizablePanelGroup
                orientation="horizontal"
                defaultLayout={mainLayout as Layout}
                onLayoutChange={onMainLayoutChanging}
                onLayoutChanged={onMainLayoutChanged}
            >
                <ResizablePanel id="panels" minSize={30} className={cn(panelTransition)}>
                    <ResizablePanelGroup orientation="vertical" defaultLayout={leftLayout as Layout} onLayoutChanged={onLeftLayoutChanged}>
                        <ResizablePanel id="list" minSize={15}>
                            <TraceWindowsList />
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        <ResizablePanel id="view" minSize={20}>
                            <TraceWindowView />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                {showCategories && <ResizableHandle withHandle />}

                <ResizablePanel
                    id="categories"
                    minSize={20}
                    collapsible
                    collapsedSize={0}
                    panelRef={categoriesPanelRef}
                    className={cn(panelTransition, !showCategories && "min-w-0 overflow-hidden")}
                    style={{ transitionDuration: `${PANEL_ANIMATION_MS}ms` }}
                >
                    <div className={cn("h-full transition-opacity duration-300", !showCategories && "opacity-0 pointer-events-none")}>
                        <TraceCheckboxesPanel />
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
