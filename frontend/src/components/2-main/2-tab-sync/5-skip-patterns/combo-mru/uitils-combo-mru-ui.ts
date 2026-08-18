import { proxy } from "valtio";
import { dropMru, pushMru, type ComboMruKey } from "./uitils-combo-mru";
import { comboMruStore } from "./a-combo-mru-store";

/** Transient combo popup state. Not persisted. */
export const comboMruUi = proxy({
    openKey: null as string | null,
});

export function comboMruOpenKey(listId: ComboMruKey, instanceId: string): string {
    return `${listId}:${instanceId}`;
}

export function closeComboMru(): void {
    comboMruUi.openKey = null;
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

export const COMBO_MRU_POPUP_ATTR = "data-combo-mru-popup";

export function isComboMruPopupTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(`[${COMBO_MRU_POPUP_ATTR}]`) != null;
}
