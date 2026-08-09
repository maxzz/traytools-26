import { useSnapshot } from "valtio";
import {
    type RegGroup,
    type RegItem,
    type RegNodeKind,
    type RegSeparator,
    type RegValue,
    createValue,
    findByUid,
} from "./9-types-registry";
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
    const item = liveSelectedItem();
    if (item) {
        fn(item);
    }
}

/** The selected key in the live (mutable) tree, not a snapshot. */
function liveSelectedItem(): RegItem | null {
    const uid = registryEditorStore.selectedUid;
    if (!uid) {
        return null;
    }
    const loc = findByUid(registryEditorStore.config, uid);
    return loc?.kind === "item" ? loc.item : null;
}

/** Edit one value row of the selected key, addressed by the value's uid. */
export function patchSelectedValue(valueUid: string, fn: (value: RegValue) => void) {
    const value = liveSelectedItem()?.values.find((v) => v.uid === valueUid);
    if (value) {
        fn(value);
    }
}

/** Append a value row, continuing the type of the last row. */
export function addSelectedItemValue(): void {
    const item = liveSelectedItem();
    if (!item) {
        return;
    }
    const value = createValue();
    const last = item.values[item.values.length - 1];
    if (last) {
        value.valueType = last.valueType;
    }
    item.values.push(value);
}

/** Remove a value row. A key always keeps at least one. */
export function removeSelectedItemValue(valueUid: string): void {
    const item = liveSelectedItem();
    if (!item || item.values.length < 2) {
        return;
    }
    const index = item.values.findIndex((v) => v.uid === valueUid);
    if (index >= 0) {
        item.values.splice(index, 1);
    }
}

/** Apply a drag-and-drop row order given as the new sequence of value uids. */
export function reorderSelectedItemValues(valueUids: readonly string[]): void {
    const item = liveSelectedItem();
    if (!item) {
        return;
    }
    const reordered = valueUids
        .map((uid) => item.values.find((v) => v.uid === uid))
        .filter((v): v is RegValue => !!v);
    if (reordered.length !== item.values.length) {
        return;
    }
    item.values = reordered;
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
