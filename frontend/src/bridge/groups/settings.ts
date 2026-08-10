import { dispatch } from "../dispatch";

const GROUP = "settings";

/**
 * Settings command group. Mirrors the "settings" group on the backend bus.
 *
 * - getRunElevated / setRunElevated — Run Elevated preference
 * - isElevated / requestElevationRestart / requestUnelevatedRestart — elevation state
 * - getQuitOnClose / setQuitOnClose — close-to-tray vs quit
 * - getShowInTaskbar / setShowInTaskbar — main window taskbar button
 * - getUnloadHookHotkey / setUnloadHookHotkey — View → unload hook shortcut
 * - getWindowSizeKey / setWindowSizeKey / toggleWindowSize — named window geometries
 */
export const settingsBus = {
    getRunElevated: () => dispatch<boolean>(GROUP, "getRunElevated"),
    setRunElevated: (value: boolean) => dispatch(GROUP, "setRunElevated", { value }),
    isElevated: () => dispatch<boolean>(GROUP, "isElevated"),
    requestElevationRestart: () => dispatch(GROUP, "requestElevationRestart"),
    requestUnelevatedRestart: () => dispatch(GROUP, "requestUnelevatedRestart"),
    getQuitOnClose: () => dispatch<boolean>(GROUP, "getQuitOnClose"),
    setQuitOnClose: (value: boolean) => dispatch(GROUP, "setQuitOnClose", { value }),
    getShowInTaskbar: () => dispatch<boolean>(GROUP, "getShowInTaskbar"),
    setShowInTaskbar: (value: boolean) => dispatch(GROUP, "setShowInTaskbar", { value }),
    getUnloadHookHotkey: () => dispatch<UnloadHookHotkeyOptions>(GROUP, "getUnloadHookHotkey"),
    setUnloadHookHotkey: (options: UnloadHookHotkeyOptions) => dispatch(GROUP, "setUnloadHookHotkey", options),
    getWindowSizeKey: () => dispatch<WindowSizeKey>(GROUP, "getWindowSizeKey"),
    setWindowSizeKey: (key: WindowSizeKey) => dispatch<WindowSizeKey>(GROUP, "setWindowSizeKey", { key }),
    toggleWindowSize: () => dispatch<WindowSizeKey>(GROUP, "toggleWindowSize"),
};

export type UnloadHookHotkeyOptions = {
    hotkey: string;
    global: boolean;
};

/** Built-in size keys; additional string keys may be added later. */
export type WindowSizeKey = "normal" | "mini" | (string & {});
