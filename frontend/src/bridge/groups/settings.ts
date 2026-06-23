import { dispatch } from "../dispatch";

const GROUP = "settings";

export const settingsBus = {
    getRunElevated: () => dispatch<boolean>(GROUP, "getRunElevated"),
    setRunElevated: (value: boolean) => dispatch(GROUP, "setRunElevated", { value }),
    isElevated: () => dispatch<boolean>(GROUP, "isElevated"),
    requestElevationRestart: () => dispatch(GROUP, "requestElevationRestart"),
};
