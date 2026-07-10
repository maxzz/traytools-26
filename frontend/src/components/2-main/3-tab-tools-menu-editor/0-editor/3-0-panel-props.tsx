import { MousePointerClick } from "lucide-react";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { type NodeKind, type ToolMenuItem, nodeKind } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/9-types-menu";
import { useSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { PropsFor_Item, PropsFor_Separator, PropsFor_Submenu } from "@/components/2-main/3-tab-tools-menu-editor/0-editor/3-1-props";

export function Panel_Props() {
    const { uid, node, isRoot } = useSelectedNode();

    return (
        <div className="min-h-0 h-full flex flex-col">
            <ScrollArea className="flex-1 min-h-0" fullHeight>
                <div className="p-3 h-full flex flex-col gap-3">
                    <PropsByKind node={node} isRoot={isRoot} />
                </div>
            </ScrollArea>
        </div>
    );
}

function PropsByKind({ node, isRoot }: { node?: ToolMenuItem | null; isRoot: boolean; }) {
    if (!node) {
        return <NoSelectionView />;
    }
    const kind = nodeKind(node);
    const Component = PROPS_BY_KIND[kind];
    return <Component node={node} isRoot={isRoot} />;
}

const PROPS_BY_KIND = {
    separator: PropsFor_Separator,
    submenu: PropsFor_Submenu,
    item: PropsFor_Item,
} satisfies Record<NodeKind, React.ComponentType<{ node: ToolMenuItem; isRoot?: boolean; }>>;

function NoSelectionView() {
    return (
        <div className="flex-1 p-6 h-full min-h-0 text-center text-muted-foreground flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <MousePointerClick className="size-6 opacity-50" />
                <span>
                    Select a menu item on the left to edit its properties.
                </span>
            </div>
        </div>
    );
}
