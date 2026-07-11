import { atom } from "jotai";
import { type ActiveWindowsInfo } from "@/bridge";

// Discrete UI state for the Active Monitor tab.

export const monitoringAtom = atom(true);

export const activeWindowsInfoAtom = atom<ActiveWindowsInfo | null>(null);

export const activeMonitorErrorAtom = atom<string | null>(null);
