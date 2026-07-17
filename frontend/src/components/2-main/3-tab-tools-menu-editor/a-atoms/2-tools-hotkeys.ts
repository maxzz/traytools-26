import { proxy } from "valtio";
import { toolsBus, type ToolHotkeyBinding } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";

type ToolsHotkeysState = {
    local: ToolHotkeyBinding[];
};

export const toolsHotkeysStore = proxy<ToolsHotkeysState>({
    local: [],
});

/**
 * Reload tools.json bindings: register/unregister global hotkeys in Go, refresh
 * the in-app local chord list, and notify the user of any conflicts.
 */
export async function syncToolsHotkeys(): Promise<void> {
    try {
        const res = await toolsBus.syncHotkeys();
        toolsHotkeysStore.local = res?.local ?? [];

        const conflicts = res?.conflicts ?? [];
        if (conflicts.length === 0) {
            return;
        }

        const lines = conflicts.map((c) => {
            const label = c.name ? `"${c.name}"` : "Hotkey";
            const chord = c.hotKey ? ` (${c.hotKey})` : "";
            return `${label}${chord}: ${c.error}`;
        });
        notice.error(`Hotkey conflict${conflicts.length > 1 ? "s" : ""}:\n ${lines.join("\n ")}`);
    } catch (e) {
        notice.error(`Failed to sync tool hotkeys:\n ${String(e)}`);
    }
}
