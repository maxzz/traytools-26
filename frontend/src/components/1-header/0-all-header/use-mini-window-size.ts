import { type RefObject, useEffect, useRef } from "react";
import { WindowGetSize, WindowSetSize } from "@/../wailsjs/runtime/runtime";
import { isBackendAvailable } from "@/wails/is-wails";
import * as measure from "./use-mini-window-measure";

type UseMiniWindowSizeArgs = {
    isMini: boolean;
    zoomLevel: number;
    showFooter: boolean;
};

type UseMiniWindowSizeResult = {
    headerRef: RefObject<HTMLElement | null>;
    toolbarRef: RefObject<HTMLDivElement | null>;
};

/**
 * Fits the OS window to the mini toolbar (+ optional footer).
 * No-op outside mini mode or when the Wails backend is unavailable.
 */
export function useMiniWindowSize({
    isMini,
    zoomLevel,
    showFooter,
}: UseMiniWindowSizeArgs): UseMiniWindowSizeResult {
    const headerRef = useRef<HTMLElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const lastOuterRef = useRef<measure.Size2 | null>(null);
    const lastContentRef = useRef<measure.Size2 | null>(null);
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
                applyingRef.current = false;
                return;
            }

            const headerEl = headerRef.current;
            const toolbarEl = toolbarRef.current;
            if (!headerEl || !toolbarEl) {
                return;
            }

            let timer = 0;
            let cancelled = false;
            // Footer toggle / zoom change — allow a fresh exact fit (including shrink).
            lastOuterRef.current = null;
            lastContentRef.current = null;
            applyingRef.current = false;

            const readOuterSize = async (): Promise<measure.Size2 | null> => {
                try {
                    const size = await WindowGetSize();
                    if (size && measure.isValidSize(size.w) && measure.isValidSize(size.h)) {
                        return { w: size.w, h: size.h };
                    }
                } catch {
                    // fall through
                }
                if (measure.isValidSize(window.outerWidth) && measure.isValidSize(window.outerHeight)) {
                    return { w: window.outerWidth, h: window.outerHeight };
                }
                return null;
            };

            const setOuterSize = (w: number, h: number) => {
                if (!measure.isValidSize(w) || !measure.isValidSize(h)) {
                    return false;
                }
                WindowSetSize(Math.round(w), Math.round(h));
                return true;
            };

            const applySize = async () => {
                if (cancelled || applyingRef.current) {
                    return;
                }

                const zoomFactor = measure.zoomFactorFromLevel(zoomLevel);
                const { layoutW, layoutH, clientW, clientH } = measure.measureClientNeed(
                    headerEl,
                    toolbarEl,
                    zoomFactor,
                );

                if (
                    !measure.isValidSize(layoutW) || !measure.isValidSize(layoutH)
                    || !measure.isValidSize(clientW) || !measure.isValidSize(clientH)
                    || layoutW < measure.MIN_CONTENT_W || layoutH < measure.MIN_CONTENT_H
                ) {
                    if (!lastOuterRef.current) {
                        timer = window.setTimeout(() => { void applySize(); }, 100);
                    }
                    return;
                }

                const prevContent = lastContentRef.current;
                const contentUnchanged = prevContent
                    && prevContent.w === layoutW
                    && prevContent.h === layoutH;
                const clientFits = measure.contentVisiblyFits(headerEl, toolbarEl, clientW, clientH);
                const oversized = measure.isClientOversized(clientW, clientH);

                if (contentUnchanged && clientFits && !oversized && lastOuterRef.current) {
                    return;
                }

                if (clientFits && !oversized && !lastOuterRef.current) {
                    lastContentRef.current = { w: layoutW, h: layoutH };
                    lastOuterRef.current = await readOuterSize();
                    return;
                }

                const { chromeW, chromeH } = measure.frameChrome();
                const w = clientW + chromeW;
                const h = clientH + chromeH;
                const nextOuter = { w, h };

                const prevOuter = lastOuterRef.current;
                if (
                    prevOuter
                    && measure.sizesClose(prevOuter, nextOuter)
                    && clientFits
                    && !oversized
                ) {
                    lastContentRef.current = { w: layoutW, h: layoutH };
                    return;
                }

                if (!measure.isValidSize(w) || !measure.isValidSize(h)) {
                    return;
                }

                applyingRef.current = true;
                lastContentRef.current = { w: layoutW, h: layoutH };
                lastOuterRef.current = nextOuter;

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

                    // Correct residual client mismatch (grow if clipped, shrink if oversized).
                    const deltaW = clientW - window.innerWidth;
                    const deltaH = clientH - window.innerHeight;
                    if (Math.abs(deltaW) > measure.SIZE_TOL_PX || Math.abs(deltaH) > measure.SIZE_TOL_PX) {
                        const outer = await readOuterSize();
                        const outerW = outer?.w ?? w;
                        const outerH = outer?.h ?? h;
                        const corrected = {
                            w: Math.max(measure.MIN_CONTENT_W + measure.FRAME_FALLBACK_W, outerW + deltaW),
                            h: Math.max(measure.MIN_CONTENT_H + measure.FRAME_FALLBACK_H, outerH + deltaH),
                        };
                        if (setOuterSize(corrected.w, corrected.h)) {
                            lastOuterRef.current = corrected;
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
                timer = window.setTimeout(
                    () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => { void applySize(); });
                        });
                    },
                    0);
            };

            schedule();
            void document.fonts?.ready?.then(() => {
                if (!cancelled) {
                    schedule();
                }
            });
            const ro = new ResizeObserver(schedule);
            ro.observe(toolbarEl);

            return () => {
                cancelled = true;
                applyingRef.current = false;
                window.clearTimeout(timer);
                ro.disconnect();
            };
        },
        [isMini, zoomLevel, showFooter]);

    return { headerRef, toolbarRef };
}
