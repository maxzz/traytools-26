export { dispatch } from "./dispatch";
export { appBus } from "./groups/app";
export { settingsBus } from "./groups/settings";
export { traceManagerBus, TRACE_MANAGER_EVENTS } from "./groups/tracemanager";
export type { SectionDescription, StringDescription, TraceCall } from "./groups/tracemanager-types";
export { onEvent, offEvent } from "./wails-events";
