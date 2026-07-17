import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { HOTKEY_EVENTS, onWailsEvent, toolsBus } from "@/bridge";
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
import { sendUnloadHookNotification } from "@/components/1-header/3-send-unload-msg-notice/3-2-unload-hook-action";
import { syncToolsHotkeys, toolsHotkeysStore } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/2-tools-hotkeys";
import { matchesHotkey, parseHotkey } from "@/ui/local-ui/9-hotkey";
import { notice } from "@/ui/local-ui/7-toaster";

export function AllDialogs() {
    return (<>
        <SettingsDialogShortcut />
        <UnloadHookHotkeyShortcut />
        <ToolsHotkeysShortcut />
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

/** Local (in-app) and global (OS) hotkey wiring for Tools menu commands. */
function ToolsHotkeysShortcut() {
    const { local } = useSnapshot(toolsHotkeysStore);

    useEffect(
        () => {
            void syncToolsHotkeys();
            return onWailsEvent<{ id: number; }>(HOTKEY_EVENTS.tool, (data) => {
                if (data?.id == null) {
                    return;
                }
                toolsBus.exec(data.id).catch((e) => {
                    notice.error(`Tool hotkey:\n ${String(e)}`);
                });
            });
        },
        [],
    );

    useEffect(
        () => {
            const bindings = local
                .map((b) => ({ id: b.id, name: b.name, chord: parseHotkey(b.hotKey) }))
                .filter((b) => b.chord);

            if (bindings.length === 0) {
                return;
            }

            function handleKeyDown(event: KeyboardEvent) {
                const target = event.target;
                if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) {
                    return;
                }

                for (const binding of bindings) {
                    if (!matchesHotkey(event, binding.chord)) {
                        continue;
                    }
                    event.preventDefault();
                    toolsBus.exec(binding.id).catch((e) => {
                        notice.error(`Command "${binding.name}":\n ${String(e)}`);
                    });
                    return;
                }
            }

            const controller = new AbortController();
            window.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [local],
    );

    return null;
}
