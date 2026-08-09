import { createContext, useContext, useMemo, useRef, useState, type DragEvent } from "react";
import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Minus } from "lucide-react";
import { IconTerminalHero } from "@/ui/icons/normal";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { type ToolMenuItem, isRegistryPath, nodeKind } from "../a-atoms/9-types-menu";
import { type DropPosition, copyNode, getNode, moveNode } from "../a-atoms/1-menu-editor-atoms";
import { ToolsConfig_Apply, toolsEditorStore } from "../a-atoms/0-menu-local-storage";
import {
    DirtyDot,
    ModifiedBadge,
    RootFileInfoButton,
    treeRowSelectedClasses,
    workingFileCaption,
} from "@/components/2-main/a-shared/tree-file-status";
import { TreeInlineName, TreeRowLabel } from "@/components/2-main/a-shared/tree-inline-rename";

// Deep-readonly view of a node as returned by valtio's useSnapshot.
type SnapNode = {
    readonly menuName: string;
    readonly cmdLine?: string;
    readonly cmdWhat?: string;
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

export function Panel_Tree() {
    const snap = useSnapshot(toolsEditorStore);
    const root = snap.config.menu as SnapNode;

    const [dragUid, setDragUid] = useState<string | null>(null);
    const [dropUid, setDropUid] = useState<string | null>(null);
    const [dropPos, setDropPos] = useState<DropPosition | null>(null);
    // drop.ctrlKey is unreliable in WebView2; remember intent from dragover.
    const wantCopyRef = useRef(false);

    const dnd = useMemo<DndState>(
        () => ({
            dragUid,
            dropUid,
            dropPos,
            onDragStart: (e, uid) => {
                setDragUid(uid);
                wantCopyRef.current = false;
                e.dataTransfer.effectAllowed = "copyMove";
                e.dataTransfer.setData("text/plain", uid);
            },
            onDragOver: (e, uid, isSubmenu, isRoot) => {
                e.preventDefault();
                const wantCopy = e.ctrlKey || e.metaKey;
                wantCopyRef.current = wantCopy;
                e.dataTransfer.dropEffect = wantCopy ? "copy" : "move";
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
                const isCopy =
                    wantCopyRef.current
                    || e.dataTransfer.dropEffect === "copy"
                    || e.ctrlKey
                    || e.metaKey;
                if (src && dropPos) {
                    if (isCopy) {
                        copyNode(src, uid, dropPos);
                    } else {
                        moveNode(src, uid, dropPos);
                    }
                }
                wantCopyRef.current = false;
                setDragUid(null);
                setDropUid(null);
                setDropPos(null);
            },
            onDragEnd: () => {
                wantCopyRef.current = false;
                setDragUid(null);
                setDropUid(null);
                setDropPos(null);
            },
            onDragLeaveRow: (uid) => {
                setDropUid((cur) => (cur === uid ? null : cur));
            },
        }),
        [dragUid, dropUid, dropPos]);

    const treeRef = useRef<HTMLDivElement>(null);
    const focusTree = () => {
        treeRef.current?.focus();
    };

    return (
        <div className="min-h-0 h-full flex flex-col">
            <ScrollArea className="flex-1 min-h-0">
                <DndContext.Provider value={dnd}>
                    <div
                        ref={treeRef}
                        className="group/tree p-1 min-h-full outline-none"
                        tabIndex={0}
                    >
                        <TreeRow node={root} depth={0} isLast isRoot ancestors={[]} onActivate={focusTree} />
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
function TreeRow({ node, depth, isLast, ancestors, isRoot = false, onActivate }: { node: SnapNode; depth: number; isLast: boolean; ancestors: boolean[]; isRoot?: boolean; onActivate: () => void; }) {
    const snap = useSnapshot(toolsEditorStore);
    const dnd = useDnd();
    const [collapsed, setCollapsed] = useState(false);
    const [renaming, setRenaming] = useState(false);

    const uid = node.uid ?? "";
    const kind = nodeKind(node as ToolMenuItem);
    const isSubmenu = kind === "submenu" || isRoot;
    const isSeparator = kind === "separator" && !isRoot;
    const isRegistry = kind === "item" && isRegistryPath(node as ToolMenuItem);
    const selected = snap.selectedUid === uid;
    const canRename = !isRoot && !isSeparator;

    const isDragging = dnd.dragUid === uid;
    const isDropTarget = dnd.dropUid === uid;
    const showBefore = !isRoot && isDropTarget && dnd.dropPos === "before";
    const showAfter = !isRoot && isDropTarget && dnd.dropPos === "after";
    const showInside = isDropTarget && dnd.dropPos === "inside";

    const Icon = isSeparator ? Minus : isSubmenu ? (collapsed ? Folder : FolderOpen) : isRegistry ? SymbolAppRegedit : IconTerminalHero;
    const childAncestors = [...ancestors, !isLast];
    const children = node.menuItems ?? [];
    const isDirty = snap.dirtyUids.includes(uid);
    const working = isRoot ? workingFileCaption(snap) : null;

    function beginRename() {
        onActivate();
        toolsEditorStore.selectedUid = uid;
        setRenaming(true);
    }

    function commitRename(next: string) {
        const live = getNode(toolsEditorStore.config.menu, uid);
        if (live && nodeKind(live) !== "separator") {
            live.menuName = next;
        }
        setRenaming(false);
    }

    return (
        <div>
            <div
                className="relative"
                draggable={!isRoot && !renaming}
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
                        "group relative px-1 h-5 rounded-none select-none flex items-center gap-1 cursor-pointer",
                        !selected && "hover:bg-accent/50",
                        selected && treeRowSelectedClasses,
                        showInside && "ring-1 ring-sky-500 bg-sky-500/10",
                        isDragging && "opacity-40",
                        isRoot && "font-medium pr-7",
                    )}
                    style={{ paddingLeft: (depth + 1) * INDENT + 6 }}
                    onClick={() => {
                        onActivate();
                        toolsEditorStore.selectedUid = uid;
                    }}
                >
                    {!isRoot && <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} isSubmenu={isSubmenu} />}

                    {isSubmenu
                        ? (
                            <button
                                type="button"
                                className="shrink-0 relative w-3 h-4 text-muted-foreground flex items-center justify-center"
                                title={collapsed ? "Expand" : "Collapse"}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCollapsed((v) => !v);
                                }}
                            >
                                {collapsed
                                    ? <ChevronRight className="size-3" />
                                    : <ChevronDown className="size-3" />
                                }
                            </button>
                        ) : (
                            <span className="shrink-0 relative size-px" />
                        )
                    }

                    {!isSeparator && (
                        <Icon className={cn(
                            "shrink-0 relative size-3.5",
                            isSubmenu
                                ? "text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900"
                                : isRegistry
                                    ? "opacity-70"
                                    : "text-foreground/70 fill-foreground/10!",
                        )} />
                    )}

                    {isSeparator
                        ? (
                            <>
                                <span className="flex-1 relative -ml-1.5 mr-2 max-w-40 border-t border-foreground/40" />
                                {isDirty && <DirtyDot />}
                            </>
                        ) : isRoot && working
                            ? (
                                <span className="flex-1 min-w-0 flex items-center gap-1">
                                    <span className="min-w-0 truncate" title={working.detail}>
                                        {node.menuName || "Tools"}: {working.label}
                                    </span>
                                    <RootFileInfoButton working={working} error={snap.error} />
                                    {snap.dirty && <ModifiedBadge onSave={ToolsConfig_Apply} />}
                                </span>
                            ) : canRename ? (
                                <TreeRowLabel
                                    renaming={renaming}
                                    onBeginRename={beginRename}
                                    trailing={isDirty ? <DirtyDot /> : null}
                                    editor={(
                                        <TreeInlineName
                                            value={node.menuName}
                                            placeholder="Menu label"
                                            onCommit={commitRename}
                                            onCancel={() => setRenaming(false)}
                                        />
                                    )}
                                >
                                    {node.menuName || <span className="text-muted-foreground italic">(unnamed)</span>}
                                </TreeRowLabel>
                            ) : (
                                <span className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
                                    <span className="min-w-0 truncate">
                                        {node.menuName || <span className="text-muted-foreground italic">(unnamed)</span>}
                                    </span>
                                    {isDirty && <DirtyDot />}
                                </span>
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
                                    onActivate={onActivate}
                                />
                            ))}
                        </div>
                    )
                    : isRoot
                        ? (
                            <div className="px-3 py-4 text-muted-foreground" style={{ paddingLeft: (depth + 2) * INDENT + 6 }}>
                                Empty. Use the menu above to add items.
                            </div>
                        )
                        : null
            )}
        </div>
    );
}

// Connector lines: continuation verticals for ancestors, plus the ├ / └ branch
// (vertical + horizontal tick) that links this row to its parent and siblings.
function TreeGuides({ depth, isLast, ancestors, isSubmenu }: { depth: number; isLast: boolean; ancestors: boolean[]; isSubmenu: boolean; }) {
    const x = guideX(depth);
    return (
        <div className="absolute inset-y-0 left-0 pointer-events-none">
            {ancestors.map((cont, a) => cont ? <span key={a} className="absolute top-0 bottom-0 border-l border-foreground/40" style={{ left: guideX(a) }} /> : null)}

            {/* Vertical from the top down to this row's midpoint (always present). */}
            <span className="absolute top-0 border-l border-foreground/40" style={{ left: x, height: "50%" }} />

            {/* Continue below the midpoint only when a sibling follows. */}
            {!isLast && <span className="absolute bottom-0 border-l border-foreground/40" style={{ left: x, top: "50%" }} />}

            {/* Horizontal tick reaching toward the row content. */}
            <span className="absolute top-1/2 border-t border-foreground/40" style={{ left: x, width: isSubmenu ? INDENT - 6 : INDENT - 3 }} />
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
            <div className="absolute -top-0.75 size-2 bg-sky-500 rounded-full -left-1" />
        </div>
    );
}
