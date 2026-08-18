import { proxy, subscribe } from "valtio";
import { parseMruList, type ComboMruKey } from "./3-combo-mru";

const STORAGE_ID = "traytools-26__combo-mru__v1.0";
const DEFAULT_SKIP_PATTERN_MRU = ["^\\.git$", "^node_modules$"];

// Combo MRU store

export type ComboMruLists = {
    [K in ComboMruKey]: string[];
};

export const comboMruStore = proxy<ComboMruLists>(loadMruLists());

subscribe(comboMruStore, saveMruLists);

function loadMruLists(): ComboMruLists {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            return listsFromUnknown(JSON.parse(stored));

            function listsFromUnknown(raw: unknown): ComboMruLists {
                const parsed = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Partial<Record<ComboMruKey, unknown>> : {};
                return {
                    skipPatterns: parsed.skipPatterns !== undefined ? parseMruList(parsed.skipPatterns) : [...DEFAULT_SKIP_PATTERN_MRU],
                };
            }
        }
    } catch (e) {
        console.error("Failed to load combo MRU", e);
    }

    const defaults = {
        skipPatterns: [...DEFAULT_SKIP_PATTERN_MRU],
    };
    return defaults;
}

function saveMruLists(): void {
    try {
        localStorage.setItem(STORAGE_ID, JSON.stringify(comboMruStore));
    } catch (e) {
        console.error("Failed to save combo MRU", e);
    }
}
