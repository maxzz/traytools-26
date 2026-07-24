import { getDefaultStore } from "jotai";
import { appBus, traceManagerBus, type SectionDescription } from "@/bridge";
import { doAsyncUnsavedQuitDialogAtom } from "@/components/4-dialogs/8-1-confirmation/1-unsaved-quit-dialog";
import { copyEditorStore, CopyConfig_Apply } from "@/components/2-main/1-tab-copy-operations/a-atoms/0-copy-local-storage";
import { toolsEditorStore, ToolsConfig_Apply } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { setSections, traceStore } from "@/store/3-trace-manager";
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
 * Handle a backend quit request: prompt when tabs are dirty, optionally save,
 * then confirmExit — or cancelQuitPrompt if the user aborts / save fails.
 */
export async function handleQuitRequested(): Promise<void> {
    const dirty = collectDirtyTabs();

    if (dirty.length === 0) {
        await appBus.confirmExit();
        return;
    }

    const store = getDefaultStore();
    const choice = await store.set(
        doAsyncUnsavedQuitDialogAtom,
        dirty.map((t) => t.label),
    );

    if (choice === "cancel") {
        await appBus.cancelQuitPrompt();
        return;
    }

    if (choice === "save") {
        for (const tab of dirty) {
            const ok = await tab.save();
            if (!ok) {
                notice.warning(`Could not save “${tab.label}”. Close cancelled.`);
                await appBus.cancelQuitPrompt();
                return;
            }
        }
    }

    await appBus.confirmExit();
}
