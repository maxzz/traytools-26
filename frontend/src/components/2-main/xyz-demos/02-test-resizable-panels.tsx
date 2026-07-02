import { type ComponentProps } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { PANEL_GROUPS } from "@/store/2-panel-sizes";
import { type Layout } from "react-resizable-panels";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/ui/shadcn/resizable";

export function TestResizablePanels({ className, ...rest }: ComponentProps<"div">) {
    const settings = useSnapshot(appSettings);

    const onHorizontalLayout = (layout: Layout) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, [PANEL_GROUPS.demosHorizontal]: layout };
    };

    const onVerticalLayout = (layout: Layout) => {
        appSettings.panelSizes = { ...appSettings.panelSizes, [PANEL_GROUPS.demosVertical]: layout };
    };

    const horizontalLayout = settings.panelSizes[PANEL_GROUPS.demosHorizontal];
    const verticalLayout = settings.panelSizes[PANEL_GROUPS.demosVertical];

    return (
        <div className={classNames("text-xs font-condensed flex flex-col", className)} {...rest}>
            <ResizablePanelsHeader />

            <div className="flex-1 min-h-0">
                <ResizablePanelGroup orientation="horizontal" defaultLayout={horizontalLayout as Layout} onLayoutChanged={onHorizontalLayout}>
                    <ResizablePanel id="left" minSize={15}>
                        <DemoPanelLeft />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel id="right" minSize={20}>
                        <ResizablePanelGroup orientation="vertical" defaultLayout={verticalLayout as Layout} onLayoutChanged={onVerticalLayout}>
                            <ResizablePanel id="top" minSize={15}>
                                <DemoPanelRightTop />
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            <ResizablePanel id="bottom" minSize={15}>
                                <DemoPanelRightBottom />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}

function ResizablePanelsHeader() {
    const settings = useSnapshot(appSettings);
    const horizontal = settings.panelSizes[PANEL_GROUPS.demosHorizontal];
    const vertical = settings.panelSizes[PANEL_GROUPS.demosVertical];

    const leftWidth = horizontal.left ?? 30;
    const rightWidth = horizontal.right ?? 70;
    const topHeight = vertical.top ?? 50;
    const bottomHeight = vertical.bottom ?? 50;

    return (
        <div className="px-4 py-3 bg-muted/20 border-b flex items-center justify-between">
            <span className="text-sm">Resizable Panels Demo</span>
            <span className="text-xs font-mono text-muted-foreground">
                H: {Math.round(leftWidth)}% : {Math.round(rightWidth)}% | V: {Math.round(topHeight)}% : {Math.round(bottomHeight)}%
            </span>
        </div>
    );
}

function DemoPanelLeft() {
    return (
        <div className="p-6 h-full text-center bg-muted/40 flex flex-col items-center justify-center">
            <span>Left Panel</span>
        </div>
    );
}

function DemoPanelRightTop() {
    return (
        <div className="p-6 h-full text-center bg-muted/40 flex flex-col items-center justify-center">
            <span>Right Top Panel</span>
        </div>
    );
}

function DemoPanelRightBottom() {
    return (
        <div className="p-6 h-full text-center bg-muted/40 flex flex-col items-center justify-center">
            <span>Right Bottom Panel</span>
        </div>
    );
}