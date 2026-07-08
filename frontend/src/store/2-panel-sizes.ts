import { type Layout } from 'react-resizable-panels';
import { appSettings } from './1-ui-settings';

/** ResizablePanelGroup layouts keyed by group name. */
export type PanelSizes = Record<string, Layout>;

export const PANEL_GROUPS = {
    demosHorizontal: 'demos.resizable.horizontal',
    demosVertical: 'demos.resizable.vertical',
    traceManagerMain: 'trace-manager.main',
    traceManagerLeft: 'trace-manager.left',
    windowTreeMain: 'window-tree.main',
    toolsEditorMain: 'tools-editor.main',
} as const;

export type PanelGroupKey = (typeof PANEL_GROUPS)[keyof typeof PANEL_GROUPS];

const PANEL_GROUP_DEFAULTS: PanelSizes = {
    [PANEL_GROUPS.demosHorizontal]: { left: 30, right: 70 },
    [PANEL_GROUPS.demosVertical]: { top: 50, bottom: 50 },
    [PANEL_GROUPS.traceManagerMain]: { panels: 68, categories: 32 },
    [PANEL_GROUPS.traceManagerLeft]: { list: 38, view: 62 },
    [PANEL_GROUPS.windowTreeMain]: { tree: 58, props: 42 },
    [PANEL_GROUPS.toolsEditorMain]: { tree: 42, props: 58 },
};

export function getValidPanelSizes(parsedSizes?: unknown): PanelSizes {
    const rv: PanelSizes = { ...PANEL_GROUP_DEFAULTS };

    if (!parsedSizes || typeof parsedSizes !== 'object') {
        return rv;
    }

    const parsed = parsedSizes as Record<string, unknown>;

    // Migrate legacy { horizontal, vertical } shape from earlier versions.
    if (parsed.horizontal && typeof parsed.horizontal === 'object') {
        rv[PANEL_GROUPS.demosHorizontal] = parsed.horizontal as Layout;
    }
    if (parsed.vertical && typeof parsed.vertical === 'object') {
        rv[PANEL_GROUPS.demosVertical] = parsed.vertical as Layout;
    }

    for (const [key, value] of Object.entries(parsed)) {
        if (key === 'horizontal' || key === 'vertical') continue;
        if (value && typeof value === 'object') {
            rv[key] = value as Layout;
        }
    }

    return rv;
}

export function savePanelLayout(name: PanelGroupKey, layout: Layout): void {
    appSettings.panelSizes = { ...appSettings.panelSizes, [name]: layout };
}
