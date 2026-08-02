import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { WindowSetSize } from "@/../wailsjs/runtime/runtime";
import { appSettings } from "@/store/1-ui-settings";
import { zoomLevelAtom } from "@/store/4-atoms-zoom";
import { windowSizeKeyAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { isBackendAvailable } from "@/wails/is-wails";
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

export function Header() {
    const { showMainTabs, showThemeToggle } = useSnapshot(appSettings);
    const sizeKey = useAtomValue(windowSizeKeyAtom);
    const zoomLevel = useAtomValue(zoomLevelAtom);
    const isMini = sizeKey === "mini";
    const headerRef = useRef<HTMLElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const lastSizeRef = useRef<{ w: number; h: number; } | null>(null);

    useEffect(
        () => {
            if (!isMini || !isBackendAvailable()) {
                lastSizeRef.current = null;
                return;
            }

            const headerEl = headerRef.current;
            const toolbarEl = toolbarRef.current;
            if (!headerEl || !toolbarEl) {
                return;
            }

            let timer = 0;

            const applySize = () => {
                // Width follows the right-side controls; height uses the full header strip
                // (padding/border) so the window matches the visible chrome under zoom.
                const zoomFactor = Math.pow(1.2, zoomLevel);
                const contentW = Math.ceil(toolbarEl.offsetWidth * zoomFactor);
                const contentH = Math.ceil(headerEl.offsetHeight * zoomFactor);
                const styles = getComputedStyle(headerEl);
                const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
                const width = contentW + Math.ceil(padX * zoomFactor);
                const height = contentH;
                const chromeW = Math.max(0, window.outerWidth - window.innerWidth);
                const chromeH = Math.max(0, window.outerHeight - window.innerHeight);
                const w = Math.max(1, width + chromeW);
                const h = Math.max(1, height + chromeH);

                const prev = lastSizeRef.current;
                if (prev && prev.w === w && prev.h === h) {
                    return;
                }
                lastSizeRef.current = { w, h };

                try {
                    WindowSetSize(w, h);
                } catch {
                    // Wails runtime unavailable (e.g. Vite-only browser dev).
                }
            };

            const schedule = () => {
                window.clearTimeout(timer);
                timer = window.setTimeout(applySize, 80);
            };

            schedule();
            const ro = new ResizeObserver(schedule);
            ro.observe(toolbarEl);
            ro.observe(headerEl);

            return () => {
                window.clearTimeout(timer);
                ro.disconnect();
            };
        },
        [isMini, zoomLevel]);

    return (
        <header
            ref={headerRef}
            className="px-3 py-1 bg-background border-b border-border flex items-center justify-between mini:justify-end"
        >
            <div className="min-w-0 flex items-center gap-3 mini:hidden">
                <AppMenubar />

                <div className="relative min-w-0">
                    {showMainTabs && <MainTabs />}
                    <UnloadHookNotice className={showMainTabs ? "absolute inset-y-0 left-0 flex items-center z-10" : "flex items-center"} />
                </div>
            </div>

            <div ref={toolbarRef} className="flex items-center gap-1">
                <ButtonWindowSize />
                <ButtonStayOnTop />
                <ButtonSettings />
                <ButtonHome />
                {showThemeToggle && <ButtonThemeToggle />}
                <DpAgentToolbar className="ml-1" />
                <ButtonExit />
                <BadgeSelfIntegrity />
            </div>
        </header>
    );
}
