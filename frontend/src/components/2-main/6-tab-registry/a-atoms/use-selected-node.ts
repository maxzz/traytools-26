import { useSnapshot } from "valtio";
import { type RegGroup, type RegItem, type RegNodeKind, type RegSeparator, findByUid } from "./9-types-registry";
import { isRootUid } from "./1-registry-editor-atoms";
import { registryEditorStore } from "./0-registry-local-storage";

export type SelectedRegNode =
    | { kind: "root"; uid: string; }
    | { kind: "group"; uid: string; group: RegGroup; }
    | { kind: "item"; uid: string; item: RegItem; group: RegGroup; }
    | { kind: "separator"; uid: string; separator: RegSeparator; group: RegGroup; };

export function useSelectedNode(): SelectedRegNode | null {
    // sync: true — controlled inputs (key path, value, names) keep caret position.
    // Without it, Valtio batches the update into a later microtask and React resets the caret.
    const { selectedUid, config } = useSnapshot(registryEditorStore, { sync: true });
    const uid = selectedUid;
    if (!uid) {
        return null;
    }

    if (isRootUid(uid)) {
        return { kind: "root", uid };
    }
    const loc = findByUid(config as unknown as typeof registryEditorStore.config, uid);
    if (!loc) {
        return null;
    }

    if (loc.kind === "group") {
        return { kind: "group", uid, group: loc.group as RegGroup };
    }
    if (loc.kind === "separator") {
        return { kind: "separator", uid, separator: loc.separator as RegSeparator, group: loc.group as RegGroup };
    }
    return { kind: "item", uid, item: loc.item as RegItem, group: loc.group as RegGroup };
}

export function selectedKind(sel: SelectedRegNode | null): RegNodeKind | null {
    return sel?.kind ?? null;
}

export function patchSelectedGroup(fn: (group: RegGroup) => void) {
    const uid = registryEditorStore.selectedUid;
    if (!uid || isRootUid(uid)) {
        return;
    }

    const loc = findByUid(registryEditorStore.config, uid);
    if (loc?.kind === "group") {
        fn(loc.group);
    }
}

export function patchSelectedItem(fn: (item: RegItem) => void) {
    const uid = registryEditorStore.selectedUid;
    if (!uid) {
        return;
    }
    const loc = findByUid(registryEditorStore.config, uid);
    if (loc?.kind === "item") {
        fn(loc.item);
    }
}

export function patchSelectedSeparator(fn: (separator: RegSeparator) => void) {
    const uid = registryEditorStore.selectedUid;
    if (!uid) {
        return;
    }
    const loc = findByUid(registryEditorStore.config, uid);
    if (loc?.kind === "separator") {
        fn(loc.separator);
    }
}
