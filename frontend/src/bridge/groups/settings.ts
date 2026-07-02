import { dispatch } from "../dispatch";

const GROUP = "settings";

/**
 * Settings command group. Mirrors the "settings" group on the backend bus.
 * 
 * - getRunElevated returns the value of the Run Elevated setting; 
 * - setRunElevated sets the value of the Run Elevated setting; 
 * - isElevated returns the value of the Elevated setting; 
 * - requestElevationRestart requests a restart with elevation; 
 * - getQuitOnClose returns the value of the Quit on Close setting; 
 * - setQuitOnClose sets the value of the Quit on Close setting.
 */
export const settingsBus = {
    getRunElevated: () => dispatch<boolean>(GROUP, "getRunElevated"),
    setRunElevated: (value: boolean) => dispatch(GROUP, "setRunElevated", { value }),
    isElevated: () => dispatch<boolean>(GROUP, "isElevated"),
    requestElevationRestart: () => dispatch(GROUP, "requestElevationRestart"),
    getQuitOnClose: () => dispatch<boolean>(GROUP, "getQuitOnClose"),
    setQuitOnClose: (value: boolean) => dispatch(GROUP, "setQuitOnClose", { value }),
};
