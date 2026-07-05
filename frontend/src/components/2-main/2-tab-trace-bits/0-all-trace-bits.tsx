import { useEffect, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { animate, motion } from "motion/react";
import { appSettings } from "@/store/1-ui-settings";
import { type Layout, type LayoutChangedMeta, usePanelRef } from "react-resizable-panels";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";
import { traceManagerBus, onWailsEvent, TRACE_EVENTS, type TraceCall } from "@/bridge";
import { routeTraceCall, setStreaming, setSections } from "@/store/3-trace-manager";
import { PANEL_GROUPS } from "@/store/2-panel-sizes";
import { expandedSectionsAtom, showCategoriesAtom } from "./a-trace-manager-atoms";
import { TraceWindowsList } from "./1-trace-windows-list";
import { TraceWindowView } from "./2-trace-window-view";
import { TraceCheckboxesPanel } from "./3-trace-checkboxes-panel";

const PANEL_SPRING = { type: "spring" as const, bounce: 0.12, duration: 0.48 };
const CONTENT_SPRING = { type: "spring" as const, bounce: 0.08, duration: 0.42 };

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
    const skipPanelAnimation = useRef(true);
    const categoriesPercent = mainLayout.categories ?? 32;
    const categoriesPercentRef = useRef(categoriesPercent);
    const [showHandle, setShowHandle] = useState(showCategories);

    categoriesPercentRef.current = categoriesPercent;

    const onMainLayoutChanged = (layout: Layout, meta: LayoutChangedMeta) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, [PANEL_GROUPS.traceManagerMain]: layout };
        if (meta.isUserInteraction) {
            setShowHandle(showCategories);
        }
    };

    const onLeftLayoutChanged = (layout: Layout) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, [PANEL_GROUPS.traceManagerLeft]: layout };
    };

    // Spring-animate the categories column width via Motion + the panel imperative API.
    useEffect(() => {
        const panel = categoriesPanelRef.current;
        if (!panel) {
            return;
        }

        const targetPercent = showCategories ? categoriesPercentRef.current : 0;

        if (skipPanelAnimation.current) {
            skipPanelAnimation.current = false;
            panel.resize(`${targetPercent}%`);
            setShowHandle(showCategories);
            return;
        }

        if (showCategories) {
            setShowHandle(true);
        }

        const fromPercent = panel.getSize().asPercentage;
        const controls = animate(fromPercent, targetPercent, {
            ...PANEL_SPRING,
            onUpdate: (latest) => panel.resize(`${latest}%`),
            onComplete: () => {
                if (!showCategories) {
                    setShowHandle(false);
                }
            },
        });

        return () => controls.stop();
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
                onLayoutChanged={onMainLayoutChanged}
            >
                <ResizablePanel id="panels" minSize={30}>
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

                {showHandle && <ResizableHandle withHandle />}

                <ResizablePanel
                    id="categories"
                    minSize={0}
                    maxSize={50}
                    panelRef={categoriesPanelRef}
                    className="min-w-0 overflow-hidden"
                >
                    <motion.div
                        className="h-full min-h-0 overflow-hidden"
                        initial={false}
                        animate={{
                            opacity: showCategories ? 1 : 0,
                            x: showCategories ? 0 : 28,
                            scale: showCategories ? 1 : 0.97,
                        }}
                        transition={CONTENT_SPRING}
                        style={{ pointerEvents: showCategories ? "auto" : "none" }}
                    >
                        <TraceCheckboxesPanel />
                    </motion.div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
