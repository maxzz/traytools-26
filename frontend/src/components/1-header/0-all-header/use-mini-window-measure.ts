/**
 * Pure measurement helpers for mini-window content-fit sizing.
 * Win10+ outer frame includes invisible resize borders (~7px L/R/B) plus title bar;
 * FRAME_FALLBACK_* is used when outer−inner cannot be trusted.
 */

export const FRAME_FALLBACK_H = 48;
export const FRAME_FALLBACK_W = 16;
export const MIN_CONTENT_W = 80;
export const MIN_CONTENT_H = 24;
/** Extra client pixels so subpixel / DPI rounding does not clip controls. */
export const CLIENT_PAD_W = 4;
export const CLIENT_PAD_H = 2;
/** Ignore subpixel / chrome noise when deciding the window already matches. */
export const SIZE_TOL_PX = 2;

export type Size2 = { w: number; h: number; };

export type LayoutContent = {
    contentW: number;
    contentH: number;
    headerH: number;
    footerH: number;
    footerW: number;
    padX: number;
};

export type ClientNeed = {
    layoutW: number;
    layoutH: number;
    clientW: number;
    clientH: number;
};

export function isValidSize(n: number): boolean {
    return Number.isFinite(n) && n > 0;
}

export function findFooterEl(headerEl: HTMLElement): HTMLElement | null {
    return headerEl.parentElement?.querySelector<HTMLElement>("[data-app-footer]") ?? null;
}

/**
 * Footer is width:100% of the window — briefly size to max-content
 * to read intrinsic width without a ResizeObserver (RO on footer loops).
 */
export function measureFooterIntrinsic(footer: HTMLElement): { footerW: number; footerH: number; } {
    const prevWidth = footer.style.width;
    const prevMaxWidth = footer.style.maxWidth;
    footer.style.width = "max-content";
    footer.style.maxWidth = "none";
    const footerW = footer.offsetWidth;
    const footerH = footer.offsetHeight;
    footer.style.width = prevWidth;
    footer.style.maxWidth = prevMaxWidth;
    return { footerW, footerH };
}

/**
 * Intrinsic content size (pre-zoom). Height comes from toolbar + padding/border
 * only — never header.offsetHeight, which grid stretch can inflate.
 */
export function measureLayoutContent(headerEl: HTMLElement, toolbarEl: HTMLElement): LayoutContent {
    const styles = getComputedStyle(headerEl);
    const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const padY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
    const borderY = (parseFloat(styles.borderTopWidth) || 0) + (parseFloat(styles.borderBottomWidth) || 0);
    const toolbarW = Math.max(toolbarEl.offsetWidth, toolbarEl.scrollWidth) + padX;
    const headerH = toolbarEl.offsetHeight + padY + borderY;

    const footer = findFooterEl(headerEl);
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
}

/** Client-pixel size needed for the toolbar (+ footer) at the current zoom. */
export function measureClientNeed(
    headerEl: HTMLElement,
    toolbarEl: HTMLElement,
    zoomFactor: number,
): ClientNeed {
    const { contentW, contentH, headerH, footerH, footerW, padX } = measureLayoutContent(headerEl, toolbarEl);
    const toolbarRect = toolbarEl.getBoundingClientRect();

    const clientW = Math.max(
        contentW * zoomFactor,
        toolbarRect.width + padX * zoomFactor,
        footerW * zoomFactor,
    );
    const clientH = Math.max(
        contentH * zoomFactor,
        toolbarRect.height + (headerH - toolbarEl.offsetHeight) * zoomFactor + footerH * zoomFactor,
    );
    return {
        layoutW: contentW,
        layoutH: contentH,
        clientW: Math.ceil(clientW) + CLIENT_PAD_W,
        clientH: Math.ceil(clientH) + CLIENT_PAD_H,
    };
}

export function frameChrome(): { chromeW: number; chromeH: number; } {
    const rawH = window.outerHeight - window.innerHeight;
    const rawW = window.outerWidth - window.innerWidth;
    const chromeH = window.innerHeight >= MIN_CONTENT_H && rawH > 0 ? rawH : FRAME_FALLBACK_H;
    const chromeW = window.innerWidth >= MIN_CONTENT_W && rawW >= 0 ? rawW : FRAME_FALLBACK_W;
    return { chromeW, chromeH };
}

/** True when toolbar/footer are fully visible in the current client area. */
export function contentVisiblyFits(
    headerEl: HTMLElement,
    toolbarEl: HTMLElement,
    clientW: number,
    clientH: number,
): boolean {
    if (window.innerWidth < clientW || window.innerHeight < clientH) {
        return false;
    }
    if (toolbarEl.getBoundingClientRect().right > window.innerWidth + 1) {
        return false;
    }
    const footer = findFooterEl(headerEl);
    if (footer && footer.scrollWidth > footer.clientWidth + 1) {
        return false;
    }
    return true;
}

export function isClientOversized(clientW: number, clientH: number): boolean {
    return (
        window.innerWidth > clientW + SIZE_TOL_PX
        || window.innerHeight > clientH + SIZE_TOL_PX
    );
}

export function sizesClose(a: Size2, b: Size2): boolean {
    return Math.abs(a.w - b.w) <= SIZE_TOL_PX && Math.abs(a.h - b.h) <= SIZE_TOL_PX;
}

export function zoomFactorFromLevel(zoomLevel: number): number {
    return Number.isFinite(zoomLevel) ? Math.pow(1.2, zoomLevel) : 1;
}
