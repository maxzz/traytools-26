import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { type Layout } from "react-resizable-panels";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";
import { traceManagerBus, onWailsEvent, TRACE_EVENTS, type TraceCall } from "@/bridge";
import { routeTraceCall, setStreaming, setSections } from "@/store/3-trace-manager";
import { mainLayoutAtom, leftLayoutAtom, expandedSectionsAtom } from "./a-trace-manager-atoms";
import { TraceWindowsList } from "./c-trace-windows-list";
import { TraceWindowView } from "./d-trace-window-view";
import { TraceCheckboxesPanel } from "./e-trace-checkboxes-panel";

// Trace Manager tab. Reproduces the legacy CTraceManagerDlg layout inside a
// single tab: a resizable [ trace panels | categories ] split, with the trace
// panels column itself split into the per-process list (top) and the selected
// window's trace view (bottom).
export function PageTraceManager() {
    const [mainLayout, setMainLayout] = useAtom(mainLayoutAtom);
    const [leftLayout, setLeftLayout] = useAtom(leftLayoutAtom);
    const setExpanded = useSetAtom(expandedSectionsAtom);

    // Subscribe to backend trace events and load the initial state once.
    useEffect(() => {
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
    }, [setExpanded]);

    return (
        <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-card">
            <ResizablePanelGroup orientation="horizontal" defaultLayout={mainLayout as Layout} onLayoutChanged={(l) => setMainLayout(l)}>
                <ResizablePanel id="panels" minSize={30}>
                    <ResizablePanelGroup orientation="vertical" defaultLayout={leftLayout as Layout} onLayoutChanged={(l) => setLeftLayout(l)}>
                        <ResizablePanel id="list" minSize={15}>
                            <TraceWindowsList />
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        <ResizablePanel id="view" minSize={20}>
                            <TraceWindowView />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="categories" minSize={20}>
                    <TraceCheckboxesPanel />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
