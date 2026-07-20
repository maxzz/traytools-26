import { dispatch } from "../dispatch";

const GROUP = "app";

/**
 * Application lifecycle group. Mirrors the "app" group registered on the
 * backend bus.
 *
 * - exit exits the application;
 * - show shows the application;
 * - hide hides the application;
 * - toggle toggles the application;
 * - revealInExplorer opens File Explorer with the given path highlighted;
 * - sendUnloadHookNotification broadcasts the DigitalPersona unhook message
 *   (View → Send unload hook notification).
 */
export const appBus = {
    exit: () => dispatch(GROUP, "exit"),
    show: () => dispatch(GROUP, "show"),
    hide: () => dispatch(GROUP, "hide"),
    toggle: () => dispatch(GROUP, "toggle"),
    revealInExplorer: (path: string) => dispatch(GROUP, "revealInExplorer", { path }),
    sendUnloadHookNotification: () => dispatch(GROUP, "sendUnloadHookNotification"),
};
