import { dispatch } from "../dispatch";

const GROUP = "app";

// Application lifecycle group. Mirrors the "app" group registered on the
// backend bus.
export const appBus = {
    exit: () => dispatch(GROUP, "exit"),
    show: () => dispatch(GROUP, "show"),
    hide: () => dispatch(GROUP, "hide"),
    toggle: () => dispatch(GROUP, "toggle"),
};
