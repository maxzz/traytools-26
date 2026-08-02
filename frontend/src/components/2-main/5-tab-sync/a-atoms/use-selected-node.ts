import { useSnapshot } from "valtio";
import { type SyncGroup, type SyncNodeKind, type SyncOpItem, type SyncSeparator, findByUid } from "./9-types-sync";
import { isRootUid } from "./1-sync-editor-atoms";
import { syncEditorStore } from "./0-sync-local-storage";

export type SelectedSyncNode =
    | { kind: "root"; uid: string; }
    | { kind: "group"; uid: string; group: SyncGroup; }
    | { kind: "item"; uid: string; item: SyncOpItem; group: SyncGroup; }
    | { kind: "separator"; uid: string; separator: SyncSeparator; group: SyncGroup; };

export function useSelectedNode(): SelectedSyncNode | null {
    // sync: true — controlled inputs (group/operation name, paths) keep caret position.
    // Without it, Valtio batches the update into a later microtask and React resets the caret.
    const { selectedUid, config } = useSnapshot(syncEditorStore, { sync: true });
    const uid = selectedUid;
    if (!uid) {
        return null;
    }

    if (isRootUid(uid)) {
        return { kind: "root", uid };
    }
    const loc = findByUid(config as unknown as typeof syncEditorStore.config, uid);
    if (!loc) {
        return null;
    }

    if (loc.kind === "group") {
        return { kind: "group", uid, group: loc.group as SyncGroup };
    }
    if (loc.kind === "separator") {
        return { kind: "separator", uid, separator: loc.separator as SyncSeparator, group: loc.group as SyncGroup };
    }
    return { kind: "item", uid, item: loc.item as SyncOpItem, group: loc.group as SyncGroup };
}

export function selectedKind(sel: SelectedSyncNode | null): SyncNodeKind | null {
    return sel?.kind ?? null;
}

export function patchSelectedGroup(fn: (group: SyncGroup) => void) {
    const uid = syncEditorStore.selectedUid;
    if (!uid || isRootUid(uid)) {
        return;
    }

    const loc = findByUid(syncEditorStore.config, uid);
    if (loc?.kind === "group") {
        fn(loc.group);
    }
}

export function patchSelectedItem(fn: (item: SyncOpItem) => void) {
    const uid = syncEditorStore.selectedUid;
    if (!uid) {
        return;
    }
    const loc = findByUid(syncEditorStore.config, uid);
    if (loc?.kind === "item") {
        fn(loc.item);
    }
}
