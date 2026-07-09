import { useSnapshot } from "valtio";
import { getNode, isRootUid, toolsEditorStore, type ToolMenuItem } from "./a-menu-editor-atoms";

export function useSelectedNode() {
    const snap = useSnapshot(toolsEditorStore);
    const uid = snap.selectedUid;
    const node = uid ? getNode(snap.config.menu as unknown as ToolMenuItem, uid) : null;

    return { uid, node, isRoot: isRootUid(uid) };
}

/** 
 * Mutate the currently selected node on the live valtio proxy. 
 * @param fn - A function that mutates the node.
 */
export function patchSelectedNode(fn: (node: ToolMenuItem) => void) {
    const uid = toolsEditorStore.selectedUid;
    if (!uid) {
        return;
    }
    const node = getNode(toolsEditorStore.config.menu, uid);
    if (node) {
        fn(node);
    }
}
