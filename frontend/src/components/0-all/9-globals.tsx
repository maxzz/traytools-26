import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { APP_EVENTS, HOTKEY_EVENTS, onWailsEvent, toolsBus } from "@/bridge";
import { ConfirmationDialog } from "@/components/4-dialogs/8-1-confirmation/0-confirmation-dialog";
import { UnsavedQuitDialog } from "@/components/4-dialogs/8-1-confirmation/1-unsaved-quit-dialog";
import { LoginDialog } from "@/components/4-dialogs/8-2-login/0-login-dialog";
import { SettingsDialog } from "@/components/4-dialogs/8-3-settings/0-settings-dialog";
import { handleQuitRequested } from "./a-quit-unsaved";
import {
    AppIsElevatedSync,
    isOpenSettingsDialogAtom,
    SettingsQuitOnCloseSync,
    SettingsRunElevatedSync,
    SettingsUnloadHookHotkeySync,
    settingsUnloadHookHotkeyAtom,
} from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { syncToolsHotkeys, toolsHotkeysStore } from "@/components/2-main/4-tab-tools-menu-editor/a-atoms/2-tools-hotkeys";
import { matchesHotkey, parseHotkey } from "@/ui/local-ui/9-hotkey";
import { sendUnloadHookNotification } from "@/components/1-header/3-send-broadcast-msg-notice/3-2-unload-hook-action";
import { RegistryConfigSync } from "@/components/2-main/3-tab-registry/a-atoms/0-registry-local-storage";
import { CopyConfigSync } from "@/components/2-main/1-tab-copy-operations/a-atoms/0-copy-local-storage";
import { SyncConfigSync } from "@/components/2-main/2-tab-sync/a-atoms/0-sync-local-storage";
import { zoomLevelAtom } from "@/store/4-atoms-zoom";
import { notice } from "@/ui/local-ui/7-toaster";
import { toggleDevTools } from "@/wails/tray-backend";
import { isBackendAvailable } from "@/wails/is-wails";
import { onZoomChanged, restoreZoom, zoomAction } from "@/wails/zoom";

export function AllDialogs() {
    return (<>
        <DevToolsShortcut />
        <SettingsDialogShortcut />
        <ZoomShortcut />
        <ZoomLevelSync />
        <UnloadHookHotkeyShortcut />
        <ToolsHotkeysShortcut />
        <AppIsElevatedSync />
        <SettingsRunElevatedSync />
        <SettingsQuitOnCloseSync />
        <SettingsUnloadHookHotkeySync />
        <CopyConfigSync />
        <RegistryConfigSync />
        <SyncConfigSync />

        <QuitRequestedListener />
        <ConfirmationDialog />
        <UnsavedQuitDialog />
        <LoginDialog />
        <SettingsDialog />
    </>);
}

/** Backend Exit / quitOnClose → prompt for unsaved tabs, then confirmExit. */
function QuitRequestedListener() {
    useEffect(
        () => {
            if (!isBackendAvailable()) {
                return;
            }
            let busy = false;
            return onWailsEvent(APP_EVENTS.quitRequested, () => {
                if (busy) {
                    return;
                }
                busy = true;
                handleQuitRequested()
                    .catch(console.error)
                    .finally(() => { busy = false; });
            });
        },
        [],
    );
    return null;
}

/**
 * Close helper for Ctrl+Shift+F12 / Ctrl+Shift+I.
 * Opening is handled natively by Wails/WebView2 — do not preventDefault, or
 * the native open path is blocked.
 */
function DevToolsShortcut() {
    useEffect(
        () => {
            if (!isBackendAvailable()) {
                return;
            }

            function handleKeyDown(event: KeyboardEvent) {
                const ctrlOrCmd = event.ctrlKey || event.metaKey;
                if (!ctrlOrCmd || !event.shiftKey) {
                    return;
                }
                if (event.code !== "F12" && event.code !== "KeyI") {
                    return;
                }

                toggleDevTools().catch(console.error);
            }

            const controller = new AbortController();
            window.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [],
    );

    return null;
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

/** Ctrl/Cmd + = / - / 0 — zoom in, out, reset (matches win-watch). */
function ZoomShortcut() {
    useEffect(
        () => {
            function handleKeyDown(event: KeyboardEvent) {
                const ctrlOrCmd = event.ctrlKey || event.metaKey;
                if (!ctrlOrCmd || event.shiftKey || event.altKey) {
                    return;
                }

                const key = event.key;
                const normalized = key.length === 1 ? key.toLowerCase() : key;

                if (normalized === "=" || normalized === "+" || normalized === "Add") {
                    zoomAction("in");
                    event.preventDefault();
                    return;
                }
                if (normalized === "-" || normalized === "_" || normalized === "Subtract") {
                    zoomAction("out");
                    event.preventDefault();
                    return;
                }
                if (normalized === "0") {
                    zoomAction("reset");
                    event.preventDefault();
                }
            }

            const controller = new AbortController();
            window.addEventListener("keydown", handleKeyDown, { signal: controller.signal });
            return () => controller.abort();
        },
        [],
    );

    return null;
}

/** Keep the zoom % label in sync with persisted / applied zoom. */
function ZoomLevelSync() {
    const setZoomLevel = useSetAtom(zoomLevelAtom);

    useEffect(
        () => {
            restoreZoom();
            return onZoomChanged(setZoomLevel);
        },
        [setZoomLevel],
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
                if (event.defaultPrevented || !matchesHotkey(event, chord)) {
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
                if (event.defaultPrevented) {
                    return;
                }

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
