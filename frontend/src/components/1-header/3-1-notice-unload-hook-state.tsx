import { proxy } from "valtio";

export const unloadHookNotice = {
    success: (message: string) => showUnloadHookNotice("success", message),
    info: (message: string) => showUnloadHookNotice("info", message),
    error: (message: string) => showUnloadHookNotice("error", message),
};

export type UnloadHookNoticeType = "success" | "info" | "error";

type UnloadHookNoticeState = {
    type: UnloadHookNoticeType | null;
    message: string | null;
};

export const unloadHookNoticeStore = proxy<UnloadHookNoticeState>({
    type: null,
    message: null,
});

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function showUnloadHookNotice(type: UnloadHookNoticeType, message: string) {
    if (dismissTimer) {
        clearTimeout(dismissTimer);
    }

    unloadHookNoticeStore.type = type;
    unloadHookNoticeStore.message = message;

    dismissTimer = setTimeout(
        () => {
            unloadHookNoticeStore.type = null;
            unloadHookNoticeStore.message = null;
            dismissTimer = null;
        },
        3000);
}
