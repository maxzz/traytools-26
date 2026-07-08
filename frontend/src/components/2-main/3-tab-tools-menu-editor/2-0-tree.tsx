import { createContext, useContext, useMemo, useState, type DragEvent } from "react";
import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Minus } from "lucide-react";
import { IconTerminalHero } from "@/ui/icons/normal";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { moveNode, nodeKind, toolsEditor, type DropPosition, type ToolMenuItem } from "@/store/5-tools-editor";
import { TreeToolbar } from "./1-1-tree-toolbar";

// Deep-readonly view of a node as returned by valtio's useSnapshot.
type SnapNode = {
    readonly menuName: string;
    readonly cmdLine?: string;
    readonly uid?: string;
    readonly menuItems?: readonly SnapNode[];
};

// ---------------------------------------------------------------------------
// Drag-and-drop shared state (kept local to the tree).

type DndState = {
    dragUid: string | null;
    dropUid: string | null;
    dropPos: DropPosition | null;
    onDragStart: (e: DragEvent, uid: string) => void;
    onDragOver: (e: DragEvent, uid: string, isSubmenu: boolean, isRoot: boolean) => void;
    onDrop: (e: DragEvent, uid: string) => void;
    onDragEnd: () => void;
    onDragLeaveRow: (uid: string) => void;
};

const DndContext = createContext<DndState | null>(null);

function useDnd(): DndState {
    const ctx = useContext(DndContext);
    if (!ctx) {
        throw new Error("Tree rows must be rendered inside ToolsTree");
    }
    return ctx;
}

// ---------------------------------------------------------------------------

export function ToolsTree() {
    const snap = useSnapshot(toolsEditor);
    const root = snap.config.menu as SnapNode;

    const [dragUid, setDragUid] = useState<string | null>(null);
    const [dropUid, setDropUid] = useState<string | null>(null);
    const [dropPos, setDropPos] = useState<DropPosition | null>(null);

    const dnd = useMemo<DndState>(
        () => ({
            dragUid,
            dropUid,
            dropPos,
            onDragStart: (e, uid) => {
                setDragUid(uid);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", uid);
            },
            onDragOver: (e, uid, isSubmenu, isRoot) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = e.currentTarget.getBoundingClientRect();
                const offset = (e.clientY - rect.top) / rect.height;
                let pos: DropPosition;
                if (isRoot) {
                    // The root has no siblings; dropping on it always nests inside.
                    pos = "inside";
                } else if (isSubmenu) {
                    pos = offset < 0.28 ? "before" : offset > 0.72 ? "after" : "inside";
                } else {
                    pos = offset < 0.5 ? "before" : "after";
                }
                setDropUid(uid);
                setDropPos(pos);
            },
            onDrop: (e, uid) => {
                e.preventDefault();
                const src = e.dataTransfer.getData("text/plain") || dragUid;
                if (src && dropPos) {
                    moveNode(src, uid, dropPos);
                }
                setDragUid(null);
                setDropUid(null);
                setDropPos(null);
            },
            onDragEnd: () => {
                setDragUid(null);
                setDropUid(null);
                setDropPos(null);
            },
            onDragLeaveRow: (uid) => {
                setDropUid((cur) => (cur === uid ? null : cur));
            },
        }),
        [dragUid, dropUid, dropPos]);

    return (
        <div className="min-h-0 h-full flex flex-col">
            <TreeToolbar />

            <ScrollArea className="flex-1 min-h-0">
                <DndContext.Provider value={dnd}>
                    <div className="p-1">
                        <TreeRow node={root} depth={0} isLast isRoot ancestors={[]} />
                    </div>
                </DndContext.Provider>
            </ScrollArea>
        </div>
    );
}

// `ancestors[a]` is true when the ancestor at level `a` has a following sibling,
// i.e. a vertical guide line should continue through this row at that column.
// `isRoot` marks the fixed top-level "Tools" node: it draws no guide lines and
// cannot be dragged (only dropped into).
function TreeRow({ node, depth, isLast, ancestors, isRoot = false }: { node: SnapNode; depth: number; isLast: boolean; ancestors: boolean[]; isRoot?: boolean; }) {
    const snap = useSnapshot(toolsEditor);
    const dnd = useDnd();
    const [collapsed, setCollapsed] = useState(false);

    const uid = node.uid ?? "";
    const kind = nodeKind(node as ToolMenuItem);
    const isSubmenu = kind === "submenu" || isRoot;
    const isSeparator = kind === "separator" && !isRoot;
    const selected = snap.selectedUid === uid;

    const isDragging = dnd.dragUid === uid;
    const isDropTarget = dnd.dropUid === uid;
    const showBefore = !isRoot && isDropTarget && dnd.dropPos === "before";
    const showAfter = !isRoot && isDropTarget && dnd.dropPos === "after";
    const showInside = isDropTarget && dnd.dropPos === "inside";

    const Icon = isSeparator ? Minus : isSubmenu ? (collapsed ? Folder : FolderOpen) : IconTerminalHero;
    const childAncestors = [...ancestors, !isLast];
    const children = node.menuItems ?? [];

    return (
        <div>
            <div
                className="relative"
                draggable={!isRoot}
                onDragStart={(e) => dnd.onDragStart(e, uid)}
                onDragOver={(e) => dnd.onDragOver(e, uid, isSubmenu, isRoot)}
                onDrop={(e) => dnd.onDrop(e, uid)}
                onDragEnd={dnd.onDragEnd}
                onDragLeave={() => dnd.onDragLeaveRow(uid)}
            >
                {/* Drop indicators */}
                {showBefore && <DragAndDropTargetLine style={{ left: guideX(depth), top: -1 }} />}
                {showAfter && <DragAndDropTargetLine style={{ left: guideX(depth), bottom: -1 }} />}

                <div
                    className={cn(
                        "group relative pr-1 h-7 hover:bg-accent/60 rounded-md select-none flex items-center gap-1 cursor-pointer",
                        selected && "bg-accent text-accent-foreground",
                        showInside && "ring-1 ring-sky-500 bg-sky-500/10",
                        isDragging && "opacity-40",
                        isRoot && "font-medium",
                    )}
                    style={{ paddingLeft: (depth + 1) * INDENT + 6 }}
                    onClick={() => { toolsEditor.selectedUid = uid; }}
                >
                    {!isRoot && <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} />}

                    {isSubmenu
                        ? (
                            <button className="shrink-0 relative w-3 h-4 text-muted-foreground flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }} title={collapsed ? "Expand" : "Collapse"}>
                                {collapsed
                                    ? <ChevronRight className="size-3" />
                                    : <ChevronDown className="size-3" />
                                }
                            </button>
                        ) : (
                            <span className="shrink-0 relative size-1" />
                        )
                    }

                    <Icon className={cn("shrink-0 relative size-3.5", isSubmenu ? "text-amber-500" : "text-muted-foreground")} />

                    {isSeparator
                        ? (
                            <span className="flex-1 relative mr-2 border-t border-dashed border-border" />
                        ) : (
                            <span className="flex-1 relative truncate">{node.menuName || <span className="text-muted-foreground italic">(unnamed)</span>}</span>
                        )
                    }
                </div>
            </div>

            {isSubmenu && !collapsed && (
                children.length > 0
                    ? (
                        <div>
                            {children.map((child, index) => (
                                <TreeRow
                                    key={child.uid}
                                    node={child}
                                    depth={depth + 1}
                                    isLast={index === children.length - 1}
                                    ancestors={childAncestors}
                                />
                            ))}
                        </div>
                    )
                    : isRoot
                        ? (
                            <div className="px-3 py-4 text-muted-foreground" style={{ paddingLeft: (depth + 2) * INDENT + 6 }}>
                                Empty. Use the + menu above to add items.
                            </div>
                        )
                        : null
            )}
        </div>
    );
}

// Connector lines: continuation verticals for ancestors, plus the ├ / └ branch
// (vertical + horizontal tick) that links this row to its parent and siblings.
function TreeGuides({ depth, isLast, ancestors }: { depth: number; isLast: boolean; ancestors: boolean[]; }) {
    const x = guideX(depth);
    return (
        <div className="absolute inset-y-0 left-0 pointer-events-none">
            {ancestors.map((cont, a) => cont ? <span key={a} className="absolute top-0 bottom-0 border-l border-foreground/40" style={{ left: guideX(a) }} /> : null)}

            {/* Vertical from the top down to this row's midpoint (always present). */}
            <span className="absolute top-0 border-l border-foreground/40" style={{ left: x, height: "50%" }} />

            {/* Continue below the midpoint only when a sibling follows. */}
            {!isLast && <span className="absolute bottom-0 border-l border-foreground/40" style={{ left: x, top: "50%" }} />}

            {/* Horizontal tick reaching toward the row content. */}
            <span className="absolute top-1/2 border-t border-foreground/40" style={{ left: x, width: INDENT - 5 }} />
        </div>
    );
}

// X position (px) of the vertical guide column for a given depth.
function guideX(depth: number): number {
    return depth * INDENT + 11;
}

const INDENT = 16;

function DragAndDropTargetLine({ style }: { style: React.CSSProperties; }) {
    return (
        <div className="absolute right-1 h-0.5 bg-sky-500 rounded-full pointer-events-none z-10" style={style}>
            <div className="absolute top-[-3px] size-2 bg-sky-500 rounded-full -left-1" />
        </div>
    );
}
