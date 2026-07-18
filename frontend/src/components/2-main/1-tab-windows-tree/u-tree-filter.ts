import { type WindowNode } from "@/bridge";

const WS_VISIBLE = 0x10000000;

// Recursively filter the tree, keeping a node when it (or any descendant)
// matches the text filter and passes the visibility filter. Returns plain
// objects so the result is safe to render outside the Valtio snapshot.
export function filterNode(node: WindowNode, needle: string, hideInvisible: boolean, collectIds: string[]): WindowNode | null {
    const kids: WindowNode[] = [];
    for (const child of node.children ?? []) {
        const kept = filterNode(child, needle, hideInvisible, collectIds);
        if (kept) {
            kids.push(kept);
        }
    }

    const isRoot = node.handle === "root";
    const selfInvisible = !isRoot && hideInvisible && (node.style & WS_VISIBLE) === 0;
    const selfMatches = needle === "" ? true : `${node.className} ${node.title} ${node.handle}`.toLowerCase().includes(needle);

    const keep = isRoot || ((selfMatches && !selfInvisible) || kids.length > 0);
    if (!keep) {
        return null;
    }

    if (kids.length > 0) {
        collectIds.push(node.handle);
    }
    return { ...node, children: kids };
}

/** Count non-root window nodes currently shown in the (possibly filtered) tree. */
export function countDisplayedWindows(node: WindowNode | null): number {
    if (!node) {
        return 0;
    }
    let n = node.handle === "root" ? 0 : 1;
    for (const child of node.children ?? []) {
        n += countDisplayedWindows(child);
    }
    return n;
}
