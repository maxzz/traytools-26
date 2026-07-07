import { useEffect } from "react";
import { atom, useSetAtom } from "jotai";
import { settingsBus } from "@/bridge/groups/settings";
import { appSettings } from "@/store/1-ui-settings";

export const isOpenSettingsDialogAtom = atom(false);
const settingsShowFooterBaseAtom = atom(appSettings.showFooter);

export const settingsShowFooterAtom = atom(
    (get) => get(settingsShowFooterBaseAtom),
    (_get, set, next: boolean) => {
        set(settingsShowFooterBaseAtom, next);
        appSettings.showFooter = next;
    },
);

const settingsStayOnTopBaseAtom = atom(appSettings.stayOnTop);

export const settingsStayOnTopAtom = atom(
    (get) => get(settingsStayOnTopBaseAtom),
    (_get, set, next: boolean) => {
        set(settingsStayOnTopBaseAtom, next);
        appSettings.stayOnTop = next;
    },
);

const settingsRunElevatedBaseAtom = atom(false);

export const settingsRunElevatedAtom = atom(
    (get) => get(settingsRunElevatedBaseAtom),
    (_get, set, next: boolean) => {
        set(settingsRunElevatedBaseAtom, next);
        settingsBus.setRunElevated(next)
            .then(() => {
                if (next) {
                    return settingsBus.requestElevationRestart();
                }
            })
            .catch(console.error);
    },
);

export function SettingsRunElevatedSync() {
    const setRunElevated = useSetAtom(settingsRunElevatedBaseAtom);

    useEffect(
        () => {
            settingsBus.getRunElevated().then(setRunElevated).catch(console.error);
        },
        [setRunElevated],
    );

    return null;
}

const settingsQuitOnCloseBaseAtom = atom(false);

export const settingsQuitOnCloseAtom = atom(
    (get) => get(settingsQuitOnCloseBaseAtom),
    (_get, set, next: boolean) => {
        set(settingsQuitOnCloseBaseAtom, next);
        settingsBus.setQuitOnClose(next).catch(console.error);
    },
);

export function SettingsQuitOnCloseSync() {
    const setQuitOnClose = useSetAtom(settingsQuitOnCloseBaseAtom);

    useEffect(
        () => {
            settingsBus.getQuitOnClose().then(setQuitOnClose).catch(console.error);
        },
        [setQuitOnClose],
    );

    return null;
}
