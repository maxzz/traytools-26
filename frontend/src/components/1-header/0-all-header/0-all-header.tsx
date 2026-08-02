import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { WindowGetSize, WindowSetSize } from "@/../wailsjs/runtime/runtime";
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

/**
 * Win10+ outer frame includes invisible resize borders (~7px L/R/B) plus title bar.
 * Used when outer−inner cannot be trusted (already-collapsed mini window).
 */
const FRAME_FALLBACK_H = 48;
const FRAME_FALLBACK_W = 16;
const MIN_CONTENT_W = 80;
const MIN_CONTENT_H = 24;
/** Extra client pixels so subpixel / DPI rounding does not clip controls. */
const CLIENT_PAD_W = 4;
const CLIENT_PAD_H = 2;

export function Header() {
    const { showMainTabs, showThemeToggle } = useSnapshot(appSettings);
    const sizeKey = useAtomValue(windowSizeKeyAtom);
    const zoomLevel = useAtomValue(zoomLevelAtom);
    const isMini = sizeKey === "mini";
    const headerRef = useRef<HTMLElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const lastOuterRef = useRef<{ w: number; h: number; } | null>(null);
    const lastContentRef = useRef<{ w: number; h: number; } | null>(null);
    const applyingRef = useRef(false);

    useEffect(
        () => {
            const html = document.documentElement;
            const body = document.body;
            if (!isMini) {
                html.style.overflow = "";
                body.style.overflow = "";
                return;
            }
            html.style.overflow = "hidden";
            body.style.overflow = "hidden";
            return () => {
                html.style.overflow = "";
                body.style.overflow = "";
            };
        },
        [isMini]);

    useEffect(
        () => {
            if (!isMini || !isBackendAvailable()) {
                lastOuterRef.current = null;
                lastContentRef.current = null;
                return;
            }

            const headerEl = headerRef.current;
            const toolbarEl = toolbarRef.current;
            if (!headerEl || !toolbarEl) {
                return;
            }

            let timer = 0;
            let cancelled = false;

            /** Content size in CSS layout px (pre-zoom), from the toolbar + header chrome. */
            const measureLayoutContent = () => {
                const styles = getComputedStyle(headerEl);
                const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
                const contentW = Math.max(toolbarEl.offsetWidth, toolbarEl.scrollWidth) + padX;
                // Prefer header box; fall back to toolbar + vertical padding/border if header collapsed.
                const padY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
                const borderY = (parseFloat(styles.borderTopWidth) || 0) + (parseFloat(styles.borderBottomWidth) || 0);
                const contentH = Math.max(
                    headerEl.offsetHeight,
                    toolbarEl.offsetHeight + padY + borderY,
                );
                return { contentW, contentH };
            };

            /**
             * Client-pixel size needed for the toolbar at the current zoom.
             * Uses max(layout×zoom, getBoundingClientRect) so both CSS-zoom and
             * native WebView zoom are covered without under-sizing.
             */
            const measureClientNeed = (zoomFactor: number) => {
                const { contentW, contentH } = measureLayoutContent();
                const toolbarRect = toolbarEl.getBoundingClientRect();
                const headerRect = headerEl.getBoundingClientRect();
                const styles = getComputedStyle(headerEl);
                const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);

                const clientW = Math.max(
                    contentW * zoomFactor,
                    toolbarRect.width + padX * zoomFactor,
                );
                const clientH = Math.max(
                    contentH * zoomFactor,
                    headerRect.height,
                    toolbarRect.height + (contentH - toolbarEl.offsetHeight) * zoomFactor,
                );
                return {
                    layoutW: contentW,
                    layoutH: contentH,
                    clientW: Math.ceil(clientW) + CLIENT_PAD_W,
                    clientH: Math.ceil(clientH) + CLIENT_PAD_H,
                };
            };

            const frameChrome = () => {
                const rawH = window.outerHeight - window.innerHeight;
                const rawW = window.outerWidth - window.innerWidth;
                const chromeH = window.innerHeight >= MIN_CONTENT_H && rawH > 0 ? rawH : FRAME_FALLBACK_H;
                const chromeW = window.innerWidth >= MIN_CONTENT_W && rawW >= 0 ? rawW : FRAME_FALLBACK_W;
                return { chromeW, chromeH };
            };

            const applySize = async () => {
                if (cancelled || applyingRef.current) {
                    return;
                }

                const zoomFactor = Math.pow(1.2, zoomLevel);
                const { layoutW, layoutH, clientW, clientH } = measureClientNeed(zoomFactor);

                if (layoutW < MIN_CONTENT_W || layoutH < MIN_CONTENT_H) {
                    // Transient bad layout (e.g. mid-resize). Keep any good size; retry only if none yet.
                    if (!lastOuterRef.current) {
                        timer = window.setTimeout(() => { void applySize(); }, 100);
                    }
                    return;
                }

                const prevContent = lastContentRef.current;
                const contentUnchanged = prevContent
                    && prevContent.w === layoutW
                    && prevContent.h === layoutH;
                const clientFits = window.innerWidth >= clientW && window.innerHeight >= clientH;

                // Skip re-apply when toolbar content is unchanged and still fully visible.
                // This stops the DPAgent 1s poll / header width RO from collapsing the window.
                if (contentUnchanged && clientFits && lastOuterRef.current) {
                    return;
                }

                const { chromeW, chromeH } = frameChrome();
                let w = clientW + chromeW;
                let h = clientH + chromeH;

                // Never shrink while staying in mini — only grow for larger toolbar / zoom.
                const prevOuter = lastOuterRef.current;
                if (prevOuter) {
                    w = Math.max(w, prevOuter.w);
                    h = Math.max(h, prevOuter.h);
                    if (w === prevOuter.w && h === prevOuter.h && clientFits) {
                        lastContentRef.current = { w: layoutW, h: layoutH };
                        return;
                    }
                }

                applyingRef.current = true;
                lastContentRef.current = { w: layoutW, h: layoutH };
                lastOuterRef.current = { w, h };

                try {
                    WindowSetSize(w, h);

                    await new Promise<void>((resolve) => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => resolve());
                        });
                    });
                    if (cancelled) {
                        return;
                    }

                    // Grow-only feedback if the client area still clips the toolbar.
                    const shortW = Math.max(0, clientW - window.innerWidth);
                    const shortH = Math.max(0, clientH - window.innerHeight);
                    if (shortW > 0 || shortH > 0) {
                        let outerW = w;
                        let outerH = h;
                        try {
                            const size = await WindowGetSize();
                            if (size?.w && size?.h) {
                                outerW = size.w;
                                outerH = size.h;
                            }
                        } catch {
                            // keep last set size
                        }
                        const nextW = outerW + shortW;
                        const nextH = outerH + shortH;
                        lastOuterRef.current = { w: nextW, h: nextH };
                        WindowSetSize(nextW, nextH);
                    }
                } catch {
                    // Wails runtime unavailable (e.g. Vite-only browser dev).
                } finally {
                    applyingRef.current = false;
                }
            };

            const schedule = () => {
                window.clearTimeout(timer);
                // Wait for mini CSS + DPAgent expand animation before first measure.
                timer = window.setTimeout(
                    () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => { void applySize(); });
                        });
                    },
                    220);
            };

            schedule();
            // Observe only the toolbar content — not the header. The header is width:100%
            // and fires on every WindowSetSize, which previously re-ran sizing and collapsed.
            const ro = new ResizeObserver(schedule);
            ro.observe(toolbarEl);

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

            <div ref={toolbarRef} className="shrink-0 flex items-center gap-1">
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
