import { atom } from "jotai";
import { windowTreeBus, type ActiveWindowsInfo } from "@/bridge";

// Discrete UI state for the Active Monitor tab.

export const monitoringAtom = atom(true);

export const activeWindowsInfoAtom = atom<ActiveWindowsInfo | null>(null);

export const activeMonitorErrorAtom = atom<string | null>(null);

let pollInFlight = false;

export const pollActiveWindowsAtom = atom(
    null,
    async (_get, set) => {
        if (pollInFlight) {
            return;
        }
        pollInFlight = true;
        try {
            const next = await windowTreeBus.getActiveWindows();
            set(activeWindowsInfoAtom, next);
            set(activeMonitorErrorAtom, null);
        } catch (e) {
            set(activeMonitorErrorAtom, String(e));
        } finally {
            pollInFlight = false;
        }
    },
);
