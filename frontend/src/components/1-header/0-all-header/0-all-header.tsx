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

function isValidSize(n: number): boolean {
    return Number.isFinite(n) && n > 0;
}

export function Header() {
    const { showMainTabs, showThemeToggle, showFooter } = useSnapshot(appSettings);
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

            const footerEl = () =>
                headerEl.parentElement?.querySelector<HTMLElement>("[data-app-footer]") ?? null;

            /**
             * Footer is width:100% of the window — briefly size to max-content
             * to read intrinsic width without observing it (RO on footer loops).
             */
            const measureFooterIntrinsic = (footer: HTMLElement) => {
                const prevWidth = footer.style.width;
                const prevMaxWidth = footer.style.maxWidth;
                footer.style.width = "max-content";
                footer.style.maxWidth = "none";
                const footerW = footer.offsetWidth;
                const footerH = footer.offsetHeight;
                footer.style.width = prevWidth;
                footer.style.maxWidth = prevMaxWidth;
                return { footerW, footerH };
            };

            /** Content size in CSS layout px (pre-zoom), from toolbar + optional footer. */
            const measureLayoutContent = () => {
                const styles = getComputedStyle(headerEl);
                const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
                const toolbarW = Math.max(toolbarEl.offsetWidth, toolbarEl.scrollWidth) + padX;
                const padY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
                const borderY = (parseFloat(styles.borderTopWidth) || 0) + (parseFloat(styles.borderBottomWidth) || 0);
                const headerH = Math.max(
                    headerEl.offsetHeight,
                    toolbarEl.offsetHeight + padY + borderY,
                );

                const footer = footerEl();
                const { footerW, footerH } = footer
                    ? measureFooterIntrinsic(footer)
                    : { footerW: 0, footerH: 0 };

                return {
                    contentW: Math.max(toolbarW, footerW),
                    contentH: headerH + footerH,
                    headerH,
                    footerH,
                    footerW,
                    padX,
                };
            };

            /**
             * Client-pixel size needed for the toolbar (+ footer) at the current zoom.
             * Uses max(layout×zoom, getBoundingClientRect) so both CSS-zoom and
             * native WebView zoom are covered without under-sizing.
             */
            const measureClientNeed = (zoomFactor: number) => {
                const { contentW, contentH, headerH, footerH, footerW, padX } = measureLayoutContent();
                const toolbarRect = toolbarEl.getBoundingClientRect();
                const headerRect = headerEl.getBoundingClientRect();
                const footer = footerEl();
                const footerRect = footer?.getBoundingClientRect();

                const clientW = Math.max(
                    contentW * zoomFactor,
                    toolbarRect.width + padX * zoomFactor,
                    footerW * zoomFactor,
                );
                const clientH = Math.max(
                    contentH * zoomFactor,
                    headerRect.height + (footerRect?.height ?? 0),
                    toolbarRect.height
                        + (headerH - toolbarEl.offsetHeight) * zoomFactor
                        + footerH * zoomFactor,
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

            /** True when toolbar/footer are fully visible in the current client area. */
            const contentVisiblyFits = (clientW: number, clientH: number) => {
                if (window.innerWidth < clientW || window.innerHeight < clientH) {
                    return false;
                }
                const toolbarRight = toolbarEl.getBoundingClientRect().right;
                if (toolbarRight > window.innerWidth + 1) {
                    return false;
                }
                const footer = footerEl();
                if (footer && footer.scrollWidth > footer.clientWidth + 1) {
                    return false;
                }
                return true;
            };

            const readOuterSize = async (): Promise<{ w: number; h: number; } | null> => {
                try {
                    const size = await WindowGetSize();
                    if (size && isValidSize(size.w) && isValidSize(size.h)) {
                        return { w: size.w, h: size.h };
                    }
                } catch {
                    // fall through
                }
                if (isValidSize(window.outerWidth) && isValidSize(window.outerHeight)) {
                    return { w: window.outerWidth, h: window.outerHeight };
                }
                return null;
            };

            const setOuterSize = (w: number, h: number) => {
                if (!isValidSize(w) || !isValidSize(h)) {
                    return false;
                }
                WindowSetSize(Math.round(w), Math.round(h));
                return true;
            };

            const applySize = async () => {
                if (cancelled || applyingRef.current) {
                    return;
                }

                const zoomFactor = Number.isFinite(zoomLevel) ? Math.pow(1.2, zoomLevel) : 1;
                const { layoutW, layoutH, clientW, clientH } = measureClientNeed(zoomFactor);

                if (
                    !isValidSize(layoutW) || !isValidSize(layoutH)
                    || !isValidSize(clientW) || !isValidSize(clientH)
                    || layoutW < MIN_CONTENT_W || layoutH < MIN_CONTENT_H
                ) {
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
                const clientFits = contentVisiblyFits(clientW, clientH);

                // Skip re-apply when toolbar content is unchanged and still fully visible.
                // This stops the DPAgent 1s poll / header width RO from collapsing the window.
                if (contentUnchanged && clientFits && lastOuterRef.current) {
                    return;
                }

                // Restored / backend size already fits — adopt it; do not resize (avoids launch jitter).
                if (clientFits && !lastOuterRef.current) {
                    lastContentRef.current = { w: layoutW, h: layoutH };
                    lastOuterRef.current = await readOuterSize();
                    return;
                }

                const { chromeW, chromeH } = frameChrome();
                let w = clientW + chromeW;
                let h = clientH + chromeH;

                // Never shrink while staying in mini — only grow for larger toolbar / zoom / footer.
                const prevOuter = lastOuterRef.current;
                if (prevOuter) {
                    w = Math.max(w, prevOuter.w);
                    h = Math.max(h, prevOuter.h);
                    if (w === prevOuter.w && h === prevOuter.h && clientFits) {
                        lastContentRef.current = { w: layoutW, h: layoutH };
                        return;
                    }
                }

                if (!isValidSize(w) || !isValidSize(h)) {
                    return;
                }

                applyingRef.current = true;
                lastContentRef.current = { w: layoutW, h: layoutH };
                lastOuterRef.current = { w, h };

                try {
                    if (!setOuterSize(w, h)) {
                        return;
                    }

                    await new Promise<void>((resolve) => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => resolve());
                        });
                    });
                    if (cancelled) {
                        return;
                    }

                    // Grow-only feedback if the client area still clips the toolbar/footer.
                    const shortW = Math.max(0, clientW - window.innerWidth);
                    const shortH = Math.max(0, clientH - window.innerHeight);
                    if (shortW > 0 || shortH > 0) {
                        const outer = await readOuterSize();
                        const outerW = outer?.w ?? w;
                        const outerH = outer?.h ?? h;
                        const nextW = outerW + shortW;
                        const nextH = outerH + shortH;
                        if (setOuterSize(nextW, nextH)) {
                            lastOuterRef.current = { w: nextW, h: nextH };
                        }
                    }
                } catch {
                    // Wails runtime unavailable (e.g. Vite-only browser dev).
                } finally {
                    applyingRef.current = false;
                }
            };

            const schedule = () => {
                window.clearTimeout(timer);
                // Double-rAF: wait for mini CSS + DPAgent (no-anim in mini) to commit layout.
                timer = window.setTimeout(
                    () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => { void applySize(); });
                        });
                    },
                    0);
            };

            schedule();
            // Footer text width depends on webfonts; remeasure once they settle.
            void document.fonts?.ready?.then(() => {
                if (!cancelled) {
                    schedule();
                }
            });
            // Observe only the toolbar content — not the header (width:100%) or footer
            // (also width:100%). Those fire on every WindowSetSize and loop into NaN sizes.
            const ro = new ResizeObserver(schedule);
            ro.observe(toolbarEl);

            return () => {
                cancelled = true;
                window.clearTimeout(timer);
                ro.disconnect();
            };
        },
        [isMini, zoomLevel, showFooter]);

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
