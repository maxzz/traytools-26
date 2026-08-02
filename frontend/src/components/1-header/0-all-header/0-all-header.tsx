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

/** Approx. Win title-bar + borders when outer/inner chrome cannot be trusted. */
const FRAME_FALLBACK_H = 40;
const FRAME_FALLBACK_W = 16;
const MIN_CONTENT_W = 80;
const MIN_CONTENT_H = 24;

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
            let cancelled = false;

            const frameChrome = () => {
                // When the window is already collapsed, outer≈inner (or inner is ~0)
                // and cannot be used to infer the title-bar size.
                const rawH = window.outerHeight - window.innerHeight;
                const rawW = window.outerWidth - window.innerWidth;
                const chromeH = window.innerHeight >= MIN_CONTENT_H && rawH > 0
                    ? rawH
                    : FRAME_FALLBACK_H;
                const chromeW = window.innerWidth >= MIN_CONTENT_W && rawW >= 0
                    ? rawW
                    : FRAME_FALLBACK_W;
                return { chromeW, chromeH };
            };

            const applySize = () => {
                if (cancelled) {
                    return;
                }

                const zoomFactor = Math.pow(1.2, zoomLevel);
                const styles = getComputedStyle(headerEl);
                const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
                const padY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
                const borderY = (parseFloat(styles.borderTopWidth) || 0) + (parseFloat(styles.borderBottomWidth) || 0);

                // Width from the right-side controls; height from toolbar + header chrome.
                const contentW = toolbarEl.offsetWidth + padX;
                const contentH = Math.max(toolbarEl.offsetHeight + padY + borderY, headerEl.scrollHeight);

                if (contentW < MIN_CONTENT_W || contentH < MIN_CONTENT_H) {
                    // Layout not ready yet — retry shortly without locking lastSize.
                    timer = window.setTimeout(applySize, 100);
                    return;
                }

                const { chromeW, chromeH } = frameChrome();
                const w = Math.max(1, Math.ceil(contentW * zoomFactor) + chromeW);
                const h = Math.max(1, Math.ceil(contentH * zoomFactor) + chromeH);

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
                // Double rAF: wait for mini CSS (hide left/body) + DPAgent expand layout.
                timer = window.setTimeout(
                    () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(applySize);
                        });
                    },
                    80);
            };

            schedule();
            const ro = new ResizeObserver(schedule);
            ro.observe(toolbarEl);
            ro.observe(headerEl);

            return () => {
                cancelled = true;
                window.clearTimeout(timer);
                ro.disconnect();
            };
        },
        [isMini, zoomLevel]);

    return (
        <header
            ref={headerRef}
            className="px-3 py-1 bg-background border-b border-border flex items-center justify-between mini:justify-end mini:min-h-8"
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
