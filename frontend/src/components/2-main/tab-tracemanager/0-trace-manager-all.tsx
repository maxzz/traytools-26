import { useAtom } from "jotai";
import { type Layout } from "react-resizable-panels";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";
import { traceSplitPercentAtom } from "./a-trace-manager-atoms";
import { TraceWindowsList } from "./c-trace-windows-list";
import { TraceWindowView } from "./d-trace-window-view";
import { TraceCheckboxesPanel } from "./e-trace-checkboxes-panel";

// PageTraceManager is the Trace Manager tab. It is the web port of the legacy
// CTraceManagerDlg, which used a WTL splitter with the process-windows
// listview above and the trace-checkboxes control below (plus floating
// CTraceWindow dialogs).
//
// Here everything lives in one tab via a horizontal [trace-panels | categories]
// split. The left column further splits vertically into the per-process
// windows list (top) and the selected window's trace lines (bottom).
export function PageTraceManager() {
    const [splitPercent, setSplitPercent] = useAtom(traceSplitPercentAtom);

    const onOuterLayout = (layout: Layout) => {
        const left = layout["trace-stream"];
        if (typeof left === "number" && left > 0 && left < 100) {
            setSplitPercent(Math.round(left));
        }
    };

    return (
        <div className="h-full min-h-0 flex flex-col">
            <ResizablePanelGroup
                orientation="horizontal"
                defaultLayout={{ "trace-stream": splitPercent, "trace-categories": 100 - splitPercent }}
                onLayoutChanged={onOuterLayout}
                className="flex-1 min-h-0"
            >
                <ResizablePanel id="trace-stream" minSize={30}>
                    <ResizablePanelGroup
                        orientation="vertical"
                        defaultLayout={{ "trace-windows": 35, "trace-view": 65 }}
                    >
                        <ResizablePanel id="trace-windows" minSize={15} maxSize={60}>
                            <TraceWindowsList />
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel id="trace-view" minSize={20}>
                            <TraceWindowView />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel id="trace-categories" minSize={20} maxSize={70}>
                    <TraceCheckboxesPanel />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
