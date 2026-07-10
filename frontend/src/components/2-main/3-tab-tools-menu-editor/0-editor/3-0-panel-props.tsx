import { Folder, Minus, MousePointerClick, Terminal } from "lucide-react";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { type NodeKind, type ToolMenuItem, nodeKind } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/9-types-menu";
import { useSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { Props_Item, Props_Separator, Props_Submenu } from "@/components/2-main/3-tab-tools-menu-editor/0-editor/3-1-props";

export function Panel_Props() {
    const { uid, node, isRoot } = useSelectedNode();

    if (!uid || !node) {
        return (
            <div className="min-h-0 h-full flex flex-col">
                <PanelHeader />

                <div className="flex-1 p-6 min-h-0 text-center text-muted-foreground flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <MousePointerClick className="size-6 opacity-50" />
                        <span>
                            Select a menu item on the left to edit its properties.
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const kind = nodeKind(node);

    return (
        <div className="min-h-0 h-full flex flex-col">
            <PanelHeader kind={kind} />

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 flex flex-col gap-3">
                    <PropsByKind kind={kind} node={node} isRoot={isRoot} />
                </div>
            </ScrollArea>
        </div>
    );
}

function PanelHeader({ kind }: { kind?: "separator" | "submenu" | "item"; }) {
    const label = kind === "submenu" ? "Submenu" : kind === "separator" ? "Separator" : kind === "item" ? "Command" : "Properties";
    const Icon = kind === "submenu" ? Folder : kind === "separator" ? Minus : Terminal;

    return (
        <div className="px-3 py-1.5 border-b flex items-center gap-2">
            <span className="font-medium text-[0.7rem] text-muted-foreground uppercase tracking-wide">Properties</span>
            {kind && (
                <span className={"ml-auto px-1.5 py-0.5 text-[0.65rem] text-muted-foreground bg-muted rounded inline-flex items-center gap-1"}>
                    <Icon className="size-3" /> {label}
                </span>
            )}
        </div>
    );
}

type PropsByKindProps = { kind: NodeKind; node: ToolMenuItem; isRoot: boolean; };

const PROPS_BY_KIND = {
    separator: Props_Separator,
    submenu: Props_Submenu,
    item: Props_Item,
} satisfies Record<NodeKind, React.ComponentType<{ node: ToolMenuItem; isRoot?: boolean; }>>;

function PropsByKind({ kind, node, isRoot }: PropsByKindProps) {
    const Component = PROPS_BY_KIND[kind];
    return <Component node={node} isRoot={isRoot} />;
}
