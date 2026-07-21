import { atom } from "jotai";

/** Electron-style zoom level: factor = 1.2^level (0 == 100%). */
export const zoomLevelAtom = atom(0);
