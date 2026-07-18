import { proxy, subscribe } from 'valtio';
import { WindowSetAlwaysOnTop } from '../../wailsjs/runtime/runtime';
import { type ThemeMode, themeApplyMode } from '../utils/theme-apply';
import { type PanelSizes, getValidPanelSizes } from './2-panel-sizes';

const STORE_KEY = "traytools-26";
const STORE_VER = "v1.0";
const STORAGE_ID = `${STORE_KEY}__${STORE_VER}`;

export interface AppSettings {
    theme: ThemeMode;            // Theme mode
    showFooter: boolean;         // Show footer in main layout
    showMainTabs: boolean;       // Show main page tabs in the header
    showThemeToggle: boolean;    // Show theme toggle button in the header
    stayOnTop: boolean;          // Keep main window above other windows
    panelSizes: PanelSizes;      // ResizablePanelGroup panel sizes
    expandedSections: string[];  // Expanded accordion sections by name
    mainTab: string;             // Active main body tab
    showDpAgentToolbar: boolean; // Expand DPAgent toolbar controls and run monitoring
    startDpAgentHigh: boolean;   // Start DPAgent elevated (runas)
}

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'light',
    showFooter: false,
    showMainTabs: false,
    showThemeToggle: false,
    stayOnTop: false,
    panelSizes: getValidPanelSizes(),
    expandedSections: ['resizable-panels', 'pierre-trees'],
    mainTab: 'welcome',
    showDpAgentToolbar: true,
    startDpAgentHigh: false,
};

// Load settings from localStorage

function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<AppSettings>;
            
            // merge stored settings with defaults to ensure new fields are present
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                panelSizes: getValidPanelSizes(parsed.panelSizes),
                expandedSections: parsed.expandedSections ?? DEFAULT_SETTINGS.expandedSections,
                mainTab: parsed.mainTab ?? DEFAULT_SETTINGS.mainTab,
                showMainTabs: parsed.showMainTabs ?? DEFAULT_SETTINGS.showMainTabs,
                showThemeToggle: parsed.showThemeToggle ?? DEFAULT_SETTINGS.showThemeToggle,
                showDpAgentToolbar: parsed.showDpAgentToolbar ?? DEFAULT_SETTINGS.showDpAgentToolbar,
                startDpAgentHigh: parsed.startDpAgentHigh ?? DEFAULT_SETTINGS.startDpAgentHigh,
            };
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
    return { ...DEFAULT_SETTINGS };
}

function applyStayOnTop(stayOnTop: boolean) {
    try {
        WindowSetAlwaysOnTop(stayOnTop);
    } catch {
        // Wails runtime unavailable (e.g. Vite-only browser dev).
    }
}

export const appSettings = proxy<AppSettings>(loadSettings());

themeApplyMode(appSettings.theme);
applyStayOnTop(appSettings.stayOnTop);

subscribe(appSettings, () => {
    try {
        themeApplyMode(appSettings.theme);
        applyStayOnTop(appSettings.stayOnTop);
        localStorage.setItem(STORAGE_ID, JSON.stringify(appSettings));
    } catch (e) {
        console.error("Failed to save settings", e);
    }
});
