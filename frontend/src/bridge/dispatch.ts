import { Dispatch as BackendDispatch } from "../../wailsjs/go/backend/App";

// Thin client over the backend command bus. Every frontend->backend call goes
// through `dispatch(group, command, payload)`, where calls are routed to the
// matching group/command handler on the Go side. Grouping keeps the many calls
// organized and lets the backend serialize same-group calls.
export async function dispatch<TRes = unknown>(group: string, command: string, payload?: unknown): Promise<TRes> {
    const payloadJSON = payload === undefined ? "" : JSON.stringify(payload);

    const resultJSON = await BackendDispatch(group, command, payloadJSON);

    if (resultJSON === "" || resultJSON === "null") {
        return undefined as TRes;
    }

    try {
        return JSON.parse(resultJSON) as TRes;
    } catch {
        return resultJSON as unknown as TRes;
    }
}
