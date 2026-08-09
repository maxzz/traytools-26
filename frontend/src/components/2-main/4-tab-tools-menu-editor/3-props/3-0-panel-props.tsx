import { MousePointerClick } from "lucide-react";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { PropsFor_Submenu } from "./3-1-props-group";
import { PropsFor_Command } from "./3-2-props-command";
import { PropsFor_Registry } from "./3-3-props-registry";
import { PropsMoreSection } from "@/components/2-main/a-shared/props-4-more-section";
import { Field_Comment, Field_TypeIcon } from "./3-4-props-shared-ui";
import { type ToolMenuItem, isRegistryPath, nodeKind } from "../a-atoms/9-types-menu";
import { useSelectedNode } from "../a-atoms/use-selected-node";

export function Panel_Props() {
    const { node, isRoot } = useSelectedNode();

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
    if (kind === "separator") {
        return <PropsFor_Separator node={node} />;
    }
    if (kind === "submenu") {
        return <PropsFor_Submenu node={node} isRoot={isRoot} />;
    }
    if (isRegistryPath(node)) {
        return <PropsFor_Registry node={node} />;
    }
    return <PropsFor_Command node={node} />;
}

function PropsFor_Separator({ node }: { node: ToolMenuItem; }) {
    return (<>
        <Field_TypeIcon node={node} />

        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the menu.
        </p>

        <PropsMoreSection>
            <Field_Comment node={node} />
        </PropsMoreSection>
    </>);
}

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
