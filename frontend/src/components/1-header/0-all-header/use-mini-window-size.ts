import { type RefObject, useEffect, useRef } from "react";
import { WindowGetSize, WindowSetSize } from "@/../wailsjs/runtime/runtime";
import { isBackendAvailable } from "@/wails/is-wails";
import {
    FRAME_FALLBACK_H,
    FRAME_FALLBACK_W,
    MIN_CONTENT_H,
    MIN_CONTENT_W,
    SIZE_TOL_PX,
    contentVisiblyFits,
    frameChrome,
    isClientOversized,
    isValidSize,
    measureClientNeed,
    sizesClose,
    zoomFactorFromLevel,
    type Size2,
} from "./mini-window-measure";

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
    const lastOuterRef = useRef<Size2 | null>(null);
    const lastContentRef = useRef<Size2 | null>(null);
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

            const readOuterSize = async (): Promise<Size2 | null> => {
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

                const zoomFactor = zoomFactorFromLevel(zoomLevel);
                const { layoutW, layoutH, clientW, clientH } = measureClientNeed(
                    headerEl,
                    toolbarEl,
                    zoomFactor,
                );

                if (
                    !isValidSize(layoutW) || !isValidSize(layoutH)
                    || !isValidSize(clientW) || !isValidSize(clientH)
                    || layoutW < MIN_CONTENT_W || layoutH < MIN_CONTENT_H
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
                const clientFits = contentVisiblyFits(headerEl, toolbarEl, clientW, clientH);
                const oversized = isClientOversized(clientW, clientH);

                if (contentUnchanged && clientFits && !oversized && lastOuterRef.current) {
                    return;
                }

                if (clientFits && !oversized && !lastOuterRef.current) {
                    lastContentRef.current = { w: layoutW, h: layoutH };
                    lastOuterRef.current = await readOuterSize();
                    return;
                }

                const { chromeW, chromeH } = frameChrome();
                const w = clientW + chromeW;
                const h = clientH + chromeH;
                const nextOuter = { w, h };

                const prevOuter = lastOuterRef.current;
                if (
                    prevOuter
                    && sizesClose(prevOuter, nextOuter)
                    && clientFits
                    && !oversized
                ) {
                    lastContentRef.current = { w: layoutW, h: layoutH };
                    return;
                }

                if (!isValidSize(w) || !isValidSize(h)) {
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
                    if (Math.abs(deltaW) > SIZE_TOL_PX || Math.abs(deltaH) > SIZE_TOL_PX) {
                        const outer = await readOuterSize();
                        const outerW = outer?.w ?? w;
                        const outerH = outer?.h ?? h;
                        const corrected = {
                            w: Math.max(MIN_CONTENT_W + FRAME_FALLBACK_W, outerW + deltaW),
                            h: Math.max(MIN_CONTENT_H + FRAME_FALLBACK_H, outerH + deltaH),
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
