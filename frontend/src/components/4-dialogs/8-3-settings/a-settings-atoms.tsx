import { useEffect } from "react";
import { atom, useSetAtom } from "jotai";
import { settingsBus } from "@/bridge/groups/settings";
import { appSettings } from "@/store/1-ui-settings";
import { notice } from "@/ui/local-ui/7-toaster";
import { formatHotkey, parseHotkey, type HotkeyChord } from "@/ui/local-ui/9-hotkey";

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

const settingsStartDpAgentHighBaseAtom = atom(appSettings.startDpAgentHigh);

export const settingsStartDpAgentHighAtom = atom(
    (get) => get(settingsStartDpAgentHighBaseAtom),
    (_get, set, next: boolean) => {
        set(settingsStartDpAgentHighBaseAtom, next);
        appSettings.startDpAgentHigh = next;
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
            settingsBus.getRunElevated().then(setRunElevated).catch((e) => {
                notice.error(`Failed to load "Run elevated" setting:\n ${String(e)}`);
            });
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
            settingsBus.getQuitOnClose().then(setQuitOnClose).catch((e) => {
                notice.error(`Failed to load "Quit on close" setting:\n ${String(e)}`);
            });
        },
        [setQuitOnClose],
    );

    return null;
}

type UnloadHookHotkeyState = {
    chord: HotkeyChord | null;
    global: boolean;
};

const settingsUnloadHookHotkeyBaseAtom = atom<UnloadHookHotkeyState>({
    chord: null,
    global: false,
});

export const settingsUnloadHookHotkeyAtom = atom(
    (get) => get(settingsUnloadHookHotkeyBaseAtom),
    (_get, set, next: UnloadHookHotkeyState) => {
        set(settingsUnloadHookHotkeyBaseAtom, next);
        settingsBus.setUnloadHookHotkey({
            hotkey: formatHotkey(next.chord),
            global: next.global && next.chord != null,
        }).catch((e) => {
            notice.error(`Failed to save unload hook hotkey:\n ${String(e)}`);
        });
    },
);

export function SettingsUnloadHookHotkeySync() {
    const setState = useSetAtom(settingsUnloadHookHotkeyBaseAtom);

    useEffect(
        () => {
            settingsBus.getUnloadHookHotkey().then((opts) => {
                setState({
                    chord: parseHotkey(opts.hotkey),
                    global: opts.global,
                });
            }).catch((e) => {
                notice.error(`Failed to load unload hook hotkey:\n ${String(e)}`);
            });
        },
        [setState],
    );

    return null;
}
