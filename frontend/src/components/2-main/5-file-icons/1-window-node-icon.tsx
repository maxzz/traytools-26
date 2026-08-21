import { Folder } from "lucide-react";
import { type WindowNode } from "@/bridge";
import { FileIcon } from "./0-file-icon";
import { iconForWindowClass, isChildWindowStyle, windowStyleIcon } from "./2-window-class-icon";

/**
 * Tree-row icon for a window node.
 * Process-group folders and top-level windows show the cached exe icon;
 * child windows keep a class-based (or style-based) Lucide glyph.
 */
export function WindowNodeIcon({ node, isProcessGroup }: { node: WindowNode; isProcessGroup: boolean; }) {
    if (isProcessGroup || !isChildWindowStyle(node.style)) {
        const fallback = isProcessGroup
            ? <Folder className="size-3.5" />
            : windowStyleIcon(node.style);
        return <FileIcon path={node.processPath} fallback={fallback} />;
    }

    return iconForWindowClass(node.className) ?? windowStyleIcon(node.style);
}
