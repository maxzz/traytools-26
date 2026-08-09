import { getDefaultStore } from "jotai";
import { appBus, traceManagerBus, type SectionDescription } from "@/bridge";
import { doAsyncUnsavedQuitDialogAtom } from "@/components/4-dialogs/8-1-confirmation/1-unsaved-quit-dialog";
import { copyEditorStore, CopyConfig_Apply } from "@/components/2-main/1-tab-copy-operations/a-atoms/0-copy-local-storage";
import { syncEditorStore, SyncConfig_Apply } from "@/components/2-main/2-tab-sync/a-atoms/0-sync-local-storage";
import { registryEditorStore, RegistryConfig_Apply } from "@/components/2-main/3-tab-registry/a-atoms/0-registry-local-storage";
import { toolsEditorStore, ToolsConfig_Apply } from "@/components/2-main/4-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { setSections, traceStore } from "@/components/2-main/7-1-tab-trace-bits/a-atoms/3-trace-manager-store";
import { notice } from "@/ui/local-ui/7-toaster";

type DirtyTab = {
    label: string;
    save: () => Promise<boolean>;
};

function collectDirtyTabs(): DirtyTab[] {
    const tabs: DirtyTab[] = [];

    if (copyEditorStore.dirty) {
        tabs.push({
            label: "Copy Operations",
            save: async () => {
                await CopyConfig_Apply();
                return !copyEditorStore.dirty && !copyEditorStore.error;
            },
        });
    }

    if (syncEditorStore.dirty) {
        tabs.push({
            label: "Sync",
            save: async () => {
                await SyncConfig_Apply();
                return !syncEditorStore.dirty && !syncEditorStore.error;
            },
        });
    }

    if (registryEditorStore.dirty) {
        tabs.push({
            label: "Registry",
            save: async () => {
                await RegistryConfig_Apply();
                return !registryEditorStore.dirty && !registryEditorStore.error;
            },
        });
    }

    if (toolsEditorStore.dirty) {
        tabs.push({
            label: "Tools Menu Editor",
            save: async () => {
                await ToolsConfig_Apply();
                return !toolsEditorStore.dirty && !toolsEditorStore.error;
            },
        });
    }

    if (traceStore.categoriesDirty) {
        tabs.push({
            label: "Trace Bits",
            save: async () => {
                try {
                    const payload: SectionDescription[] = JSON.parse(JSON.stringify(traceStore.sections));
                    const sections = await traceManagerBus.saveCategories(payload);
                    setSections(sections ?? payload);
                    return !traceStore.categoriesDirty;
                } catch (e) {
                    notice.error(`Failed to save Trace Bits: ${String(e)}`);
                    return false;
                }
            },
        });
    }

    return tabs;
}

/**
 * Prompt when editor tabs are dirty. Returns "proceed" after save/discard (or when
 * nothing is dirty), or "cancel" if the user aborts or a save fails.
 * Used before quit and before elevation restart (both exit this process).
 */
export async function resolveDirtyTabsBeforeDestructiveAction(): Promise<"proceed" | "cancel"> {
    const dirty = collectDirtyTabs();
    if (dirty.length === 0) {
        return "proceed";
    }

    const store = getDefaultStore();
    const choice = await store.set(
        doAsyncUnsavedQuitDialogAtom,
        dirty.map((t) => t.label),
    );

    if (choice === "cancel") {
        return "cancel";
    }

    if (choice === "save") {
        for (const tab of dirty) {
            const ok = await tab.save();
            if (!ok) {
                notice.warning(`Could not save “${tab.label}”. Action cancelled.`);
                return "cancel";
            }
        }
    }

    return "proceed";
}

/**
 * Handle a backend quit request: prompt when tabs are dirty, optionally save,
 * then confirmExit — or cancelQuitPrompt if the user aborts / save fails.
 */
export async function handleQuitRequested(): Promise<void> {
    const result = await resolveDirtyTabsBeforeDestructiveAction();
    if (result === "cancel") {
        await appBus.cancelQuitPrompt();
        return;
    }
    await appBus.confirmExit();
}
