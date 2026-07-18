import { dispatch } from "../dispatch";

const GROUP = "settings";

/**
 * Settings command group. Mirrors the "settings" group on the backend bus.
 *
 * - getRunElevated / setRunElevated — Run Elevated preference
 * - isElevated / requestElevationRestart / requestUnelevatedRestart — elevation state
 * - getQuitOnClose / setQuitOnClose — close-to-tray vs quit
 * - getUnloadHookHotkey / setUnloadHookHotkey — View → unload hook shortcut
 */
export const settingsBus = {
    getRunElevated: () => dispatch<boolean>(GROUP, "getRunElevated"),
    setRunElevated: (value: boolean) => dispatch(GROUP, "setRunElevated", { value }),
    isElevated: () => dispatch<boolean>(GROUP, "isElevated"),
    requestElevationRestart: () => dispatch(GROUP, "requestElevationRestart"),
    requestUnelevatedRestart: () => dispatch(GROUP, "requestUnelevatedRestart"),
    getQuitOnClose: () => dispatch<boolean>(GROUP, "getQuitOnClose"),
    setQuitOnClose: (value: boolean) => dispatch(GROUP, "setQuitOnClose", { value }),
    getUnloadHookHotkey: () => dispatch<UnloadHookHotkeyOptions>(GROUP, "getUnloadHookHotkey"),
    setUnloadHookHotkey: (options: UnloadHookHotkeyOptions) => dispatch(GROUP, "setUnloadHookHotkey", options),
};

export type UnloadHookHotkeyOptions = {
    hotkey: string;
    global: boolean;
};
