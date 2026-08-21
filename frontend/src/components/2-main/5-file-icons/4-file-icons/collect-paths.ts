import { type WindowNode } from "@/bridge";

/**
 * Unique process image paths from the tree's top-level windows.
 * Child nodes omit processPath, so a shallow walk of root.children is enough.
 */
export function collectWindowProcessPaths(root: WindowNode | null | undefined): string[] {
    if (!root) {
        return [];
    }
    const seen = new Set<string>();
    const out: string[] = [];

    for (const child of root.children ?? []) {
        const path = (child.processPath ?? "").trim();
        if (!path) {
            continue;
        }

        const key = path.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        
        seen.add(key);
        out.push(path);
    }
    return out;
}
