import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { type WindowNode } from "@/bridge";
import { cn } from "@/utils";
import { TreeNode, TreeNodeTrigger, TreeExpander, TreeIcon, TreeLabel, TreeNodeContent } from "@/ui/shadcn/kibo-ui-tree";
import { AppWindow, Square, Layers, Folder } from "lucide-react";
import { showHandlesAtom, selectedHandleAtom, boundsNoticeFlashAtom, type BoundsNoticeKind } from "./s-windows-tree-state";

interface WindowTreeNodeProps {
    node: WindowNode;
    level: number;
    isLast: boolean;
    parentPath: boolean[];
}

export function WindowTreeNode({ node, level, isLast, parentPath }: WindowTreeNodeProps) {
    const showHandles = useAtomValue(showHandlesAtom);
    const selectedHandle = useAtomValue(selectedHandleAtom);
    const isRoot = node.handle === "root";
    const children = node.children ?? [];
    const hasChildren = children.length > 0;
    const isSelected = !isRoot && selectedHandle === node.handle;

    return (
        <TreeNode nodeId={node.handle} level={level} isLast={isLast} parentPath={parentPath}>
            <TreeNodeTrigger hasChildren={hasChildren}>
                <TreeExpander hasChildren={hasChildren} />
                <TreeIcon hasChildren={hasChildren} icon={nodeIcon(node, isRoot)} />
                <TreeLabel className={cn("text-xs", !isRoot && !node.visible && "")}>
                    {nodeLabel(node, isRoot, showHandles)}
                </TreeLabel>
                {isSelected && <BoundsNoticeFlashBadge />}
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

function BoundsNoticeFlashBadge() {
    const flash = useAtomValue(boundsNoticeFlashAtom);
    const [active, setActive] = useState<{ token: number; kind: BoundsNoticeKind } | null>(null);

    useEffect(
        () => {
            if (flash.token <= 0) {
                return;
            }
            setActive({ token: flash.token, kind: flash.kind });
            const timeout = setTimeout(
                () => {
                    setActive((current) => current?.token === flash.token ? null : current);
                },
                1600
            );
            return () => clearTimeout(timeout);
        },
        [flash.token, flash.kind]
    );

    const label = active?.kind === "offscreen" ? "off-screen" : "empty bounds";

    return (
        <AnimatePresence initial={false}>
            {active !== null && (
                <motion.div
                    key={active.token}
                    className="ml-1 shrink-0 px-2 pb-0.5 text-[0.6rem] text-white bg-red-500 rounded"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: [0, 1, 1, 0], scale: [0.92, 1.06, 1.0, 0.98] }}
                    transition={{ duration: 1.55, times: [0, 0.2, 0.45, 1], ease: "easeOut" }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                >
                    {label}
                </motion.div>
            )}
        </AnimatePresence>
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
