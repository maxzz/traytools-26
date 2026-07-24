import { useSnapshot } from "valtio";
import { type CopyGroup, type CopyNodeKind, type CopyOpItem, findByUid } from "./9-types-copy";
import { isRootUid } from "./1-copy-editor-atoms";
import { copyEditorStore } from "./0-copy-local-storage";

export type SelectedCopyNode =
    | { kind: "root"; uid: string; }
    | { kind: "group"; uid: string; group: CopyGroup; }
    | { kind: "item"; uid: string; item: CopyOpItem; group: CopyGroup; };

export function useSelectedNode(): SelectedCopyNode | null {
    // sync: true — controlled inputs (group/operation name, paths) keep caret position.
    // Without it, Valtio batches the update into a later microtask and React resets the caret.
    const snap = useSnapshot(copyEditorStore, { sync: true });
    const uid = snap.selectedUid;
    if (!uid) {
        return null;
    }
    if (isRootUid(uid)) {
        return { kind: "root", uid };
    }
    const loc = findByUid(snap.config as unknown as typeof copyEditorStore.config, uid);
    if (!loc) {
        return null;
    }
    if (loc.kind === "group") {
        return { kind: "group", uid, group: loc.group as CopyGroup };
    }
    return { kind: "item", uid, item: loc.item as CopyOpItem, group: loc.group as CopyGroup };
}

export function selectedKind(sel: SelectedCopyNode | null): CopyNodeKind | null {
    return sel?.kind ?? null;
}

export function patchSelectedGroup(fn: (group: CopyGroup) => void) {
    const uid = copyEditorStore.selectedUid;
    if (!uid || isRootUid(uid)) {
        return;
    }
    const loc = findByUid(copyEditorStore.config, uid);
    if (loc?.kind === "group") {
        fn(loc.group);
    }
}

export function patchSelectedItem(fn: (item: CopyOpItem) => void) {
    const uid = copyEditorStore.selectedUid;
    if (!uid) {
        return;
    }
    const loc = findByUid(copyEditorStore.config, uid);
    if (loc?.kind === "item") {
        fn(loc.item);
    }
}
