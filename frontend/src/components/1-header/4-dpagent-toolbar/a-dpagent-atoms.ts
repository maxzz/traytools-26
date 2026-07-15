import { atom } from "jotai";
import { dpAgentBus, type DpAgentStatus, type IntegrityLevel } from "@/bridge";

export const dpAgentStatusAtom = atom<DpAgentStatus | null>(null);
export const dpAgentBusyAtom = atom(false);
export const dpAgentErrorAtom = atom<string | null>(null);

let pollInFlight = false;

export const pollDpAgentStatusAtom = atom(
    null,
    async (_get, set) => {
        if (pollInFlight) {
            return;
        }
        pollInFlight = true;
        try {
            const next = await dpAgentBus.getStatus();
            set(dpAgentStatusAtom, next);
            set(dpAgentErrorAtom, null);
        } catch (e) {
            set(dpAgentErrorAtom, String(e));
        } finally {
            pollInFlight = false;
        }
    },
);

export const startDpAgentAtom = atom(
    null,
    async (_get, set, asHigh: boolean) => {
        set(dpAgentBusyAtom, true);
        set(dpAgentErrorAtom, null);
        try {
            await dpAgentBus.start(asHigh);
            await set(pollDpAgentStatusAtom);
        } catch (e) {
            set(dpAgentErrorAtom, String(e));
            throw e;
        } finally {
            set(dpAgentBusyAtom, false);
        }
    },
);

export const stopDpAgentAtom = atom(
    null,
    async (_get, set) => {
        set(dpAgentBusyAtom, true);
        set(dpAgentErrorAtom, null);
        try {
            await dpAgentBus.stop();
            await set(pollDpAgentStatusAtom);
        } catch (e) {
            set(dpAgentErrorAtom, String(e));
            throw e;
        } finally {
            set(dpAgentBusyAtom, false);
        }
    },
);

/** Short glyph shown in the toolbar integrity slots (legacy UAC sprite cells). */
export function integrityGlyph(level: IntegrityLevel | undefined): string {
    switch (level) {
        case "high":
            return "H";
        case "medium":
            return "M";
        case "mediumplus":
            return "M+";
        case "low":
            return "L";
        case "undetected":
            return "?";
        case "na":
        default:
            return "?";
    }
}

export function integrityTitle(level: IntegrityLevel | undefined, subject: string): string {
    switch (level) {
        case "high":
            return `${subject}: High integrity`;
        case "medium":
            return `${subject}: Medium integrity`;
        case "mediumplus":
            return `${subject}: Medium-plus integrity`;
        case "low":
            return `${subject}: Low integrity`;
        case "undetected":
            return `${subject}: Integrity undetected`;
        case "na":
            return `${subject}: N/A`;
        default:
            return `${subject}: Unknown`;
    }
}
