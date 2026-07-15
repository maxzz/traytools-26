import { dispatch } from "../dispatch";

const GROUP = "dpagent";

export type IntegrityLevel = "na" | "undetected" | "high" | "medium" | "mediumplus" | "low";

export type DpAgentStatus = {
    running: boolean;
    agentIntegrity: IntegrityLevel;
    selfIntegrity: IntegrityLevel;
    agentPath?: string;
};

/**
 * DPAgent toolbar group. Mirrors the "dpagent" group registered on the backend
 * bus (legacy traytools Start/Stop + 1s run monitor).
 */
export const dpAgentBus = {
    getStatus: () => dispatch<DpAgentStatus>(GROUP, "getStatus"),
    start: (asHigh: boolean) => dispatch(GROUP, "start", { asHigh }),
    stop: () => dispatch(GROUP, "stop"),
};
