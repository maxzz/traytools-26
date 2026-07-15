import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { HOTKEY_EVENTS, onWailsEvent } from "@/bridge";
import { ConfirmationDialog } from "@/components/4-dialogs/8-1-confirmation/0-confirmation-dialog";
import { LoginDialog } from "@/components/4-dialogs/8-2-login/0-login-dialog";
import { SettingsDialog } from "@/components/4-dialogs/8-3-settings/0-settings-dialog";
import {
    isOpenSettingsDialogAtom,
    SettingsQuitOnCloseSync,
    SettingsRunElevatedSync,
    SettingsUnloadHookHotkeySync,
    settingsUnloadHookHotkeyAtom,
} from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { sendUnloadHookNotification } from "@/components/1-header/3-2-unload-hook-action";
import { matchesHotkey } from "@/ui/local-ui/9-hotkey";

export function AllDialogs() {
    return (<>
        <SettingsDialogShortcut />
        <UnloadHookHotkeyShortcut />
        <SettingsRunElevatedSync />
        <SettingsQuitOnCloseSync />
        <SettingsUnloadHookHotkeySync />

        <ConfirmationDialog />
        <LoginDialog />
        <SettingsDialog />
    </>);
}

function SettingsDialogShortcut() {
    const openSettingsDialog = useSetAtom(isOpenSettingsDialogAtom);

    useEffect(
        () => {
            function handleKeyDown(event: KeyboardEvent) {
                if (!event.ctrlKey || event.key !== ",") {
                    return;
                }

                const target = event.target;
                if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) {
                    return;
                }

                event.preventDefault();
                openSettingsDialog(true);
            }

            const controller = new AbortController();
            window.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [openSettingsDialog],
    );

    return null;
}

/** Local (in-app) and global (OS) hotkey wiring for unload-hook. */
function UnloadHookHotkeyShortcut() {
    const { chord, global } = useAtomValue(settingsUnloadHookHotkeyAtom);

    useEffect(
        () => {
            // System-wide: Go RegisterHotKey → Wails event.
            if (global && chord) {
                return onWailsEvent(HOTKEY_EVENTS.unloadHook, () => {
                    void sendUnloadHookNotification();
                });
            }

            // In-app only: listen while the webview has focus.
            if (!chord || global) {
                return;
            }

            function handleKeyDown(event: KeyboardEvent) {
                if (!matchesHotkey(event, chord)) {
                    return;
                }

                const target = event.target;
                if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) {
                    return;
                }

                event.preventDefault();
                void sendUnloadHookNotification();
            }

            const controller = new AbortController();
            window.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [chord, global],
    );

    return null;
}
