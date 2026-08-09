import { proxy } from "valtio";

export const unloadHookNotice = {
    success: (message: string) => showUnloadHookNotice("success", message, true),
    info: (message: string) => showUnloadHookNotice("info", message, false),
    error: (message: string) => showUnloadHookNotice("error", message, true),
    dismiss: () => dismissUnloadHookNotice(),
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

function clearDismissTimer() {
    if (dismissTimer) {
        clearTimeout(dismissTimer);
        dismissTimer = null;
    }
}

function dismissUnloadHookNotice() {
    clearDismissTimer();
    unloadHookNoticeStore.type = null;
    unloadHookNoticeStore.message = null;
}

function showUnloadHookNotice(type: UnloadHookNoticeType, message: string, autoDismiss: boolean) {
    clearDismissTimer();

    unloadHookNoticeStore.type = type;
    unloadHookNoticeStore.message = message;

    if (!autoDismiss) {
        return;
    }

    dismissTimer = setTimeout(
        () => {
            unloadHookNoticeStore.type = null;
            unloadHookNoticeStore.message = null;
            dismissTimer = null;
        },
        3000);
}
