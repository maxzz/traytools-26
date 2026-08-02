import { type RefObject, useEffect, useRef } from "react";
import { WindowGetSize, WindowSetSize } from "@/../wailsjs/runtime/runtime";
import { isBackendAvailable } from "@/wails/is-wails";
import * as measure from "./use-mini-window-measure";

/**
 * Fits the OS window to the mini toolbar (+ optional footer).
 * No-op outside mini mode or when the Wails backend is unavailable.
 */
export function useMiniWindowSize({ isMini, zoomLevel, showFooter }: UseMiniWindowSizeArgs): UseMiniWindowSizeResult {
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

            const ctx: ApplySizeCtx = {
                headerEl,
                toolbarEl,
                zoomLevel,
                isCancelled: () => cancelled,
                applyingRef,
                lastOuterRef,
                lastContentRef,
            };

            // Run a fresh apply pass.
            const runApply = async () => {
                const result = await applyMiniWindowSize(ctx);
                if (result === "retry" && !cancelled) {
                    timer = window.setTimeout(() => { void runApply(); }, 100);
                }
            };

            // Schedule a fresh apply pass.
            const schedule = () => {
                window.clearTimeout(timer);
                timer = window.setTimeout(
                    () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => { void runApply(); });
                        });
                    },
                    0);
            };

            schedule();
            void document.fonts?.ready?.then(
                () => {
                    if (!cancelled) {
                        schedule();
                    }
                }
            );
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

type UseMiniWindowSizeArgs = {
    isMini: boolean;
    zoomLevel: number;
    showFooter: boolean;
};

type UseMiniWindowSizeResult = {
    headerRef: RefObject<HTMLElement | null>;
    toolbarRef: RefObject<HTMLDivElement | null>;
};

//---------------------------------------------------------------------------
// Apply size

type ApplySizeCtx = {
    headerEl: HTMLElement;
    toolbarEl: HTMLElement;
    zoomLevel: number;
    isCancelled: () => boolean;
    applyingRef: RefObject<boolean>;
    lastOuterRef: RefObject<measure.Size2 | null>;
    lastContentRef: RefObject<measure.Size2 | null>;
};

type ApplySizeResult = "done" | "retry" | "skipped"; // Result of one apply pass — effect owns retry timing.

/**
 * One pass of mini-window content-fit sizing.
 * Side-effectful (reads DOM / window, calls WindowSetSize); effect owns observe/schedule/cleanup.
 */
async function applyMiniWindowSize(ctx: ApplySizeCtx): Promise<ApplySizeResult> {
    const { headerEl, toolbarEl, zoomLevel, isCancelled, applyingRef, lastOuterRef, lastContentRef } = ctx;

    if (isCancelled() || applyingRef.current) {
        return "skipped";
    }

    const zoomFactor = measure.zoomFactorFromLevel(zoomLevel);
    const { layoutW, layoutH, clientW, clientH } = measure.measureClientNeed(headerEl, toolbarEl, zoomFactor);

    // Skip if the layout is invalid or too small.
    if (
        !measure.isValidSize(layoutW) || !measure.isValidSize(layoutH)
        || !measure.isValidSize(clientW) || !measure.isValidSize(clientH)
        || layoutW < measure.MIN_CONTENT_W || layoutH < measure.MIN_CONTENT_H
    ) {
        return lastOuterRef.current ? "skipped" : "retry";
    }

    const prevContent = lastContentRef.current;
    const contentUnchanged = prevContent && prevContent.w === layoutW && prevContent.h === layoutH;
    const clientFits = measure.contentVisiblyFits(headerEl, toolbarEl, clientW, clientH);
    const oversized = measure.isClientOversized(clientW, clientH);

    // Skip if the content is unchanged, fits, and not oversized.
    if (contentUnchanged && clientFits && !oversized && lastOuterRef.current) {
        return "skipped";
    }

    // If the content fits, not oversized, and no previous outer size, set the current outer size.
    if (clientFits && !oversized && !lastOuterRef.current) {
        lastContentRef.current = { w: layoutW, h: layoutH };
        lastOuterRef.current = await readOuterSize();
        return "done";
    }

    const { chromeW, chromeH } = measure.frameChrome();
    const w = clientW + chromeW;
    const h = clientH + chromeH;
    const nextOuter = { w, h }; // Next outer size to set.

    // Skip if the previous outer size is close to the next outer size, the content fits, and not oversized.
    const prevOuter = lastOuterRef.current;
    if (prevOuter && measure.sizesClose(prevOuter, nextOuter) && clientFits && !oversized) {
        lastContentRef.current = { w: layoutW, h: layoutH };
        return "skipped";
    }

    // Skip if the next outer size is invalid.
    if (!measure.isValidSize(w) || !measure.isValidSize(h)) {
        return "skipped";
    }

    applyingRef.current = true;
    lastContentRef.current = { w: layoutW, h: layoutH };
    lastOuterRef.current = nextOuter;

    try {
        if (!setOuterSize(w, h)) {
            return "skipped";
        }

        await waitTwoFrames();
        if (isCancelled()) {
            return "skipped";
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
        return "done";
    } catch {
        return "skipped"; // Wails runtime unavailable (e.g. Vite-only browser dev).
    } finally {
        applyingRef.current = false;
    }
}

/** Read the outer size of the window. */
async function readOuterSize(): Promise<measure.Size2 | null> {
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
}

/** Set the outer size of the window. */
function setOuterSize(w: number, h: number): boolean {
    if (!measure.isValidSize(w) || !measure.isValidSize(h)) {
        return false;
    }
    WindowSetSize(Math.round(w), Math.round(h));
    return true;
}

/** Wait for two frames. */
function waitTwoFrames(): Promise<void> {
    return new Promise(
        (resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            });
        }
    );
}
