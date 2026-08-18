import { proxy, subscribe } from "valtio";
import { dropMru, parseMruList, pushMru, type ComboMruKey } from "./3-combo-mru";

const STORAGE_ID = "traytools-26__combo-mru__v1.0";
const LEGACY_APP_SETTINGS_ID = "traytools-26__v1.0";

const DEFAULT_SKIP_PATTERN_MRU = ["^\\.git$", "^node_modules$"];

// Combo MRU store

export type ComboMruLists = {
    [K in ComboMruKey]: string[];
};

export const comboMruStore = proxy<ComboMruLists>(loadLists());

subscribe(comboMruStore, persistLists);

try {
    if (localStorage.getItem(STORAGE_ID) == null) {
        persistLists();
    }
} catch {
    // localStorage unavailable
}

function loadLists(): ComboMruLists {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            return listsFromUnknown(JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to load combo MRU", e);
    }

    const legacy = readLegacySkipPatternMru();
    if (legacy) {
        return { skipPatterns: legacy };
    }
    
    return defaultLists();
}

function persistLists(): void {
    try {
        localStorage.setItem(STORAGE_ID, JSON.stringify(comboMruStore));
    } catch (e) {
        console.error("Failed to save combo MRU", e);
    }
}

function defaultLists(): ComboMruLists {
    return {
        skipPatterns: [...DEFAULT_SKIP_PATTERN_MRU],
    };
}

//

function listsFromUnknown(raw: unknown): ComboMruLists {
    const parsed = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw as Partial<Record<ComboMruKey, unknown>>
        : {};
    return {
        skipPatterns: parsed.skipPatterns !== undefined
            ? parseMruList(parsed.skipPatterns)
            : [...DEFAULT_SKIP_PATTERN_MRU],
    };
}

function readLegacySkipPatternMru(): string[] | undefined {
    try {
        const stored = localStorage.getItem(LEGACY_APP_SETTINGS_ID);
        if (!stored) {
            return undefined;
        }
        const parsed = JSON.parse(stored) as { skipPatternMru?: unknown; };
        if (parsed.skipPatternMru === undefined) {
            return undefined;
        }
        return parseMruList(parsed.skipPatternMru);
    } catch {
        return undefined;
    }
}



/** Transient combo popup state. Not persisted. */
export const comboMruUi = proxy({
    openKey: null as string | null,
});

export function comboMruOpenKey(listId: ComboMruKey, instanceId: string): string {
    return `${listId}:${instanceId}`;
}

export function rememberComboMru(listId: ComboMruKey, value: string): void {
    comboMruStore[listId] = pushMru(comboMruStore[listId], value);
}

export function rememberComboMruMany(listId: ComboMruKey, values: readonly string[]): void {
    let list = comboMruStore[listId];
    for (const value of values) {
        list = pushMru(list, value);
    }
    comboMruStore[listId] = list;
}

export function removeComboMru(listId: ComboMruKey, value: string): void {
    comboMruStore[listId] = dropMru(comboMruStore[listId], value);
}

export function closeComboMru(): void {
    comboMruUi.openKey = null;
}

export const COMBO_MRU_POPUP_ATTR = "data-combo-mru-popup";

export function isComboMruPopupTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(`[${COMBO_MRU_POPUP_ATTR}]`) != null;
}
