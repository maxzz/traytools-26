import { proxy } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { dropMru, pushMru, type ComboMruKey } from "@/store/3-combo-mru";

/** Transient combo popup state. Not persisted. */
export const comboMruUi = proxy({
    openKey: null as string | null,
});

export function comboMruOpenKey(listId: ComboMruKey, instanceId: string): string {
    return `${listId}:${instanceId}`;
}

export function rememberComboMru(listId: ComboMruKey, value: string): void {
    appSettings[listId] = pushMru(appSettings[listId], value);
}

export function rememberComboMruMany(listId: ComboMruKey, values: readonly string[]): void {
    let list = appSettings[listId];
    for (const value of values) {
        list = pushMru(list, value);
    }
    appSettings[listId] = list;
}

export function removeComboMru(listId: ComboMruKey, value: string): void {
    appSettings[listId] = dropMru(appSettings[listId], value);
}

export function closeComboMru(): void {
    comboMruUi.openKey = null;
}

export const COMBO_MRU_POPUP_ATTR = "data-combo-mru-popup";

export function isComboMruPopupTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(`[${COMBO_MRU_POPUP_ATTR}]`) != null;
}
