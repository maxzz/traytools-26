import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { zoomLevelAtom } from "@/store/4-atoms-zoom";
import { windowSizeKeyAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { AppMenubar } from "./1-0-app-menubar";
import { MainTabs } from "./1-2-main-tabs";
import { UnloadHookNotice } from "../3-send-unload-msg-notice/3-0-notice-unload-hook";
import { DpAgentToolbar } from "../4-dpagent-toolbar";
import { ButtonHome } from "./2-0-btn-home";
import { ButtonWindowSize } from "./2-1-btn-window-size";
import { ButtonStayOnTop } from "./2-1-btn-stay-on-top";
import { ButtonSettings } from "./2-2-btn-settings";
import { ButtonThemeToggle } from "./2-3-btn-theme-toggle";
import { BadgeSelfIntegrity, ButtonExit } from "./5-btn-exit-self-integrity";
import { useMiniWindowSize } from "./use-mini-window-size";

export function Header() {
    const { showMainTabs, showThemeToggle, showFooter, showDpAgentMonitor } = useSnapshot(appSettings);
    const sizeKey = useAtomValue(windowSizeKeyAtom);
    const zoomLevel = useAtomValue(zoomLevelAtom);
    const isMini = sizeKey === "mini";
    const { headerRef, toolbarRef } = useMiniWindowSize({ isMini, zoomLevel, showFooter });

    return (
        <header
            ref={headerRef}
            className="mini:self-start px-3 py-1 mini:min-h-8 mini:w-full bg-background mini:justify-end border-b border-border flex items-center justify-between"
        >
            <div className="min-w-0 mini:hidden flex items-center gap-3">
                <AppMenubar />

                <div className="relative min-w-0">
                    {showMainTabs && <MainTabs />}
                    <UnloadHookNotice className={showMainTabs ? "absolute inset-y-0 left-0 flex items-center z-10" : "flex items-center"} />
                </div>
            </div>

            <div ref={toolbarRef} className="shrink-0 flex items-center gap-1">
                <ButtonWindowSize />
                <ButtonStayOnTop />
                {!isMini && <ButtonSettings />}
                {!isMini && <ButtonHome />}
                {showThemeToggle && <ButtonThemeToggle />}
                {showDpAgentMonitor && <DpAgentToolbar className="ml-1" />}
                <ButtonExit />
                <BadgeSelfIntegrity />
            </div>
        </header>
    );
}
