import { appBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import { unloadHookNotice } from "@/components/1-header/3-send-unload-msg-notice/3-1-notice-unload-hook-state";

/** Shared action for the View menu item and local/global hotkeys. */
export function sendUnloadHookNotification() {
    unloadHookNotice.info("Sending...");
    return appBus.sendUnloadHookNotification()
        .then(() => {
            unloadHookNotice.success("Sent");
        })
        .catch((e) => {
            unloadHookNotice.dismiss();
            notice.error(`Failed: Send unload hook notification:\n ${String(e)}`);
        });
}
