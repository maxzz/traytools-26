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
const CLIENT_PAD_H = 1;

export function Header() {
    const { showMainTabs, showThemeToggle } = useSnapshot(appSettings);
    const sizeKey = useAtomValue(windowSizeKeyAtom);
    const zoomLevel = useAtomValue(zoomLevelAtom);
    const isMini = sizeKey === "mini";
    const headerRef = useRef<HTMLElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const lastSizeRef = useRef<{ w: number; h: number; } | null>(null);
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
            // Prevent scrollbar gutters from stealing client space while we fit the window.
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

            const measureContent = () => {
                const styles = getComputedStyle(headerEl);
                const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
                // header.offsetHeight already includes padding + border — do not add them again.
                const contentW = Math.max(toolbarEl.offsetWidth, toolbarEl.scrollWidth) + padX;
                const contentH = headerEl.offsetHeight;
                return { contentW, contentH };
            };

            const frameChrome = () => {
                const rawH = window.outerHeight - window.innerHeight;
                const rawW = window.outerWidth - window.innerWidth;
                // Use live chrome when the client area is trustworthy; otherwise fall back.
                // Do not Math.max with the fallback — that was adding ~10–15px of empty height.
                const chromeH = window.innerHeight >= MIN_CONTENT_H && rawH > 0
                    ? rawH
                    : FRAME_FALLBACK_H;
                const chromeW = window.innerWidth >= MIN_CONTENT_W && rawW >= 0
                    ? rawW
                    : FRAME_FALLBACK_W;
                return { chromeW, chromeH };
            };

            const applySize = async () => {
                if (cancelled || applyingRef.current) {
                    return;
                }

                const zoomFactor = Math.pow(1.2, zoomLevel);
                const { contentW, contentH } = measureContent();

                if (contentW < MIN_CONTENT_W || contentH < MIN_CONTENT_H) {
                    timer = window.setTimeout(() => { void applySize(); }, 100);
                    return;
                }

                const clientW = Math.ceil(contentW * zoomFactor) + CLIENT_PAD_W;
                const clientH = Math.ceil(contentH * zoomFactor) + CLIENT_PAD_H;
                const { chromeW, chromeH } = frameChrome();
                let w = clientW + chromeW;
                let h = clientH + chromeH;

                const prev = lastSizeRef.current;
                if (prev && prev.w === w && prev.h === h) {
                    const needW = Math.max(0, clientW - window.innerWidth);
                    const needH = Math.max(0, clientH - window.innerHeight);
                    if (needW === 0 && needH === 0) {
                        return;
                    }
                    w = prev.w + needW;
                    h = prev.h + needH;
                }

                applyingRef.current = true;
                lastSizeRef.current = { w, h };

                try {
                    WindowSetSize(w, h);

                    // Feedback pass: grow only if the client area still clips the toolbar.
                    await new Promise<void>((resolve) => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => resolve());
                        });
                    });
                    if (cancelled) {
                        return;
                    }

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
                        const nextW = outerW + shortW + CLIENT_PAD_W;
                        const nextH = outerH + shortH + CLIENT_PAD_H;
                        lastSizeRef.current = { w: nextW, h: nextH };
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
                // Wait for mini CSS + DPAgent expand animation (~200ms) before measuring.
                timer = window.setTimeout(
                    () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => { void applySize(); });
                        });
                    },
                    220);
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
