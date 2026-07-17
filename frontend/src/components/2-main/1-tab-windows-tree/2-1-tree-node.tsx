import { useAtomValue } from "jotai";
import { type WindowNode } from "@/bridge";
import { cn } from "@/utils";
import { TreeNode, TreeNodeTrigger, TreeExpander, TreeIcon, TreeLabel, TreeNodeContent } from "@/ui/shadcn/kibo-ui-tree";
import { AppWindow, Square, Layers, Folder } from "lucide-react";
import { showHandlesAtom } from "./s-windows-tree-state";

interface WindowTreeNodeProps {
    node: WindowNode;
    level: number;
    isLast: boolean;
    parentPath: boolean[];
}

export function WindowTreeNode({ node, level, isLast, parentPath }: WindowTreeNodeProps) {
    const showHandles = useAtomValue(showHandlesAtom);
    const isRoot = node.handle === "root";
    const children = node.children ?? [];
    const hasChildren = children.length > 0;

    return (
        <TreeNode nodeId={node.handle} level={level} isLast={isLast} parentPath={parentPath}>
            <TreeNodeTrigger hasChildren={hasChildren}>
                <TreeExpander hasChildren={hasChildren} />
                <TreeIcon hasChildren={hasChildren} icon={nodeIcon(node, isRoot)} />
                <TreeLabel className={cn("text-xs", !isRoot && !node.visible && "")}>
                    {nodeLabel(node, isRoot, showHandles)}
                </TreeLabel>
            </TreeNodeTrigger>

            {hasChildren && (
                <TreeNodeContent hasChildren={hasChildren}>
                    {children.map(
                        (child, index) => (
                            <WindowTreeNode
                                key={child.handle}
                                node={child}
                                level={level + 1}
                                isLast={index === children.length - 1}
                                parentPath={[...parentPath, isLast]}
                            />
                        )
                    )}
                </TreeNodeContent>
            )}
        </TreeNode>
    );
}

function nodeLabel(node: WindowNode, isRoot: boolean, showHandles: boolean) {
    if (isRoot) {
        return <span className="font-condensed">{node.title}</span>;
    }
    const cls = node.className || "(no class)";
    const text = node.title ? ` "${node.title}"` : "";
    return (<>
        {showHandles && <span className="mr-1 font-mono text-[0.65rem] text-muted-foreground/60">{node.handle}</span>}
        <span className="font-condensed">{cls}{text}</span>
    </>);
}

function nodeIcon(node: WindowNode, isRoot: boolean) {
    if (isRoot) {
        return <Folder className="size-4" />;
    }
    if (node.style & WS_CHILD) {
        return <Square className="size-4" />;
    }
    if (node.style & WS_POPUP) {
        return <Layers className="size-4" />;
    }
    return <AppWindow className="size-4" />;
}

const WS_CHILD = 0x40000000;
const WS_POPUP = 0x80000000;
