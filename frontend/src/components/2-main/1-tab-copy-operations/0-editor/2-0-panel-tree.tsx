import { createContext, useContext, useMemo, useRef, useState, type DragEvent } from "react";
import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { ChevronDown, ChevronRight, Copy, Folder, FolderOpen, FileIcon } from "lucide-react";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Button } from "@/ui/shadcn/button";
import { itemLabel, type CopyOpItem } from "../a-atoms/9-types-copy";
import { type DropPosition, moveNode } from "../a-atoms/1-copy-editor-atoms";
import { copyEditorStore } from "../a-atoms/0-copy-local-storage";
import { runCopyGroup, runCopyItem } from "../a-atoms/2-run-copy";

/** Same focus/unfocus selection look as the Windows tab (kibo-ui-tree). */
const ROW_SELECTED = cn(
    "text-tree-select-foreground bg-tree-select",
    "group-focus-within/tree:bg-tree-select-focused group-focus-within/tree:text-tree-select-focused-foreground",
    "group-focus-within/tree:ring-1 group-focus-within/tree:ring-inset group-focus-within/tree:ring-tree-select-border",
    "group-focus-within/tree:font-medium",
);

type SnapGroup = {
    readonly name: string;
    readonly uid?: string;
    readonly items: readonly SnapItem[];
};

type SnapItem = {
    readonly sourceFile: string;
    readonly destFolder: string;
    readonly uid?: string;
};

type DndState = {
    dragUid: string | null;
    dropUid: string | null;
    dropPos: DropPosition | null;
    onDragStart: (e: DragEvent, uid: string) => void;
    onDragOver: (e: DragEvent, uid: string, isGroup: boolean, isRoot: boolean) => void;
    onDrop: (e: DragEvent, uid: string) => void;
    onDragEnd: () => void;
    onDragLeaveRow: (uid: string) => void;
};

const DndContext = createContext<DndState | null>(null);

function useDnd(): DndState {
    const ctx = useContext(DndContext);
    if (!ctx) {
        throw new Error("Tree rows must be rendered inside Panel_Tree");
    }
    return ctx;
}

export function Panel_Tree() {
    const snap = useSnapshot(copyEditorStore);
    const groups = snap.config.groups as readonly SnapGroup[];
    const rootUid = snap.rootUid;
    const treeRef = useRef<HTMLDivElement>(null);

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
            onDragOver: (e, uid, isGroup, isRoot) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = e.currentTarget.getBoundingClientRect();
                const offset = (e.clientY - rect.top) / rect.height;
                let pos: DropPosition;
                if (isRoot) {
                    pos = "inside";
                } else if (isGroup) {
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

    const focusTree = () => {
        treeRef.current?.focus();
    };

    return (
        <div className="min-h-0 h-full flex flex-col">
            <ScrollArea className="flex-1 min-h-0" fixedWidth parentContentWidth>
                <DndContext.Provider value={dnd}>
                    <div
                        ref={treeRef}
                        className="group/tree p-1 outline-none"
                        data-slot="tree-view"
                        tabIndex={0}
                    >
                        <RootRow rootUid={rootUid} groups={groups} onActivate={focusTree} />
                    </div>
                </DndContext.Provider>
            </ScrollArea>
        </div>
    );
}

function RootRow({ rootUid, groups, onActivate }: { rootUid: string; groups: readonly SnapGroup[]; onActivate: () => void; }) {
    const snap = useSnapshot(copyEditorStore);
    const dnd = useDnd();
    const [collapsed, setCollapsed] = useState(false);
    const selected = snap.selectedUid === rootUid;
    const isDropTarget = dnd.dropUid === rootUid;
    const showInside = isDropTarget && dnd.dropPos === "inside";

    return (
        <div>
            <div
                className="relative"
                onDragOver={(e) => dnd.onDragOver(e, rootUid, true, true)}
                onDrop={(e) => dnd.onDrop(e, rootUid)}
                onDragLeave={() => dnd.onDragLeaveRow(rootUid)}
            >
                <div
                    className={cn(
                        "group relative mx-0 px-1 h-5 font-medium rounded-none select-none flex items-center gap-1 cursor-pointer",
                        !selected && "hover:bg-accent/50",
                        selected && ROW_SELECTED,
                        showInside && "ring-1 ring-sky-500 bg-sky-500/10",
                    )}
                    style={{ paddingLeft: INDENT + 8 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onActivate();
                        copyEditorStore.selectedUid = rootUid;
                    }}
                >
                    <button
                        type="button"
                        className="shrink-0 relative w-4 h-4 text-muted-foreground flex items-center justify-center"
                        title={collapsed ? "Expand" : "Collapse"}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCollapsed((v) => !v);
                        }}
                    >
                        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
                    {collapsed
                        ? <Folder className="shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                        : <FolderOpen className="shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                    }
                    <span className="min-w-0 flex-1 relative truncate">Groups</span>
                </div>
            </div>

            {!collapsed && (
                groups.length > 0
                    ? (
                        <div>
                            {groups.map((group, index) => (
                                <GroupRow
                                    key={group.uid}
                                    group={group}
                                    depth={1}
                                    isLast={index === groups.length - 1}
                                    ancestors={[]}
                                    onActivate={onActivate}
                                />
                            ))}
                        </div>
                    )
                    : (
                        <div className="px-3 py-4 text-muted-foreground" style={{ paddingLeft: 2 * INDENT + 8 }}>
                            Empty. Use the menu above to add groups.
                        </div>
                    )
            )}
        </div>
    );
}

function GroupRow({
    group,
    depth,
    isLast,
    ancestors,
    onActivate,
}: {
    group: SnapGroup;
    depth: number;
    isLast: boolean;
    ancestors: boolean[];
    onActivate: () => void;
}) {
    const snap = useSnapshot(copyEditorStore);
    const dnd = useDnd();
    const [collapsed, setCollapsed] = useState(false);
    const uid = group.uid ?? "";
    const selected = snap.selectedUid === uid;
    const isDragging = dnd.dragUid === uid;
    const isDropTarget = dnd.dropUid === uid;
    const showBefore = isDropTarget && dnd.dropPos === "before";
    const showAfter = isDropTarget && dnd.dropPos === "after";
    const showInside = isDropTarget && dnd.dropPos === "inside";
    // ancestors[i] true ⇒ ancestor at level i has a following sibling (continue the vertical).
    const childAncestors = [...ancestors, !isLast];

    return (
        <div>
            <div
                className="relative"
                draggable
                onDragStart={(e) => dnd.onDragStart(e, uid)}
                onDragOver={(e) => dnd.onDragOver(e, uid, true, false)}
                onDrop={(e) => dnd.onDrop(e, uid)}
                onDragEnd={dnd.onDragEnd}
                onDragLeave={() => dnd.onDragLeaveRow(uid)}
            >
                {showBefore && <DragAndDropTargetLine style={{ left: guideX(depth), top: -1 }} />}
                {showAfter && <DragAndDropTargetLine style={{ left: guideX(depth), bottom: -1 }} />}

                <div
                    className={cn(
                        "group relative px-1 h-5 rounded-none select-none flex items-center gap-1 cursor-pointer",
                        !selected && "hover:bg-accent/50",
                        selected && ROW_SELECTED,
                        showInside && "ring-1 ring-sky-500 bg-sky-500/10",
                        isDragging && "opacity-40",
                    )}
                    style={{ paddingLeft: (depth + 1) * INDENT + 8 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onActivate();
                        copyEditorStore.selectedUid = uid;
                    }}
                >
                    <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} hasChildren />
                    <button
                        type="button"
                        className="shrink-0 relative w-4 h-4 text-muted-foreground flex items-center justify-center"
                        title={collapsed ? "Expand" : "Collapse"}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCollapsed((v) => !v);
                        }}
                    >
                        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
                    {collapsed
                        ? <Folder className="shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                        : <FolderOpen className="shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                    }
                    <span className="min-w-0 flex-1 relative truncate">{group.name || <span className="text-muted-foreground italic">(unnamed)</span>}</span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 opacity-0 group-hover:opacity-100"
                        title="Copy this group"
                        onClick={(e) => {
                            e.stopPropagation();
                            const g = copyEditorStore.config.groups.find((row) => row.uid === uid);
                            if (g) {
                                runCopyGroup(g);
                            }
                        }}
                    >
                        <Copy className="size-3" />
                    </Button>
                </div>
            </div>

            {!collapsed && group.items.map((item, index) => (
                <ItemRow
                    key={item.uid}
                    item={item}
                    depth={depth + 1}
                    isLast={index === group.items.length - 1}
                    ancestors={childAncestors}
                    onActivate={onActivate}
                />
            ))}
        </div>
    );
}

function ItemRow({
    item,
    depth,
    isLast,
    ancestors,
    onActivate,
}: {
    item: SnapItem;
    depth: number;
    isLast: boolean;
    ancestors: boolean[];
    onActivate: () => void;
}) {
    const snap = useSnapshot(copyEditorStore);
    const dnd = useDnd();
    const uid = item.uid ?? "";
    const selected = snap.selectedUid === uid;
    const isDragging = dnd.dragUid === uid;
    const isDropTarget = dnd.dropUid === uid;
    const showBefore = isDropTarget && dnd.dropPos === "before";
    const showAfter = isDropTarget && dnd.dropPos === "after";
    const label = itemLabel(item as CopyOpItem);

    return (
        <div
            className="relative"
            draggable
            onDragStart={(e) => dnd.onDragStart(e, uid)}
            onDragOver={(e) => dnd.onDragOver(e, uid, false, false)}
            onDrop={(e) => dnd.onDrop(e, uid)}
            onDragEnd={dnd.onDragEnd}
            onDragLeave={() => dnd.onDragLeaveRow(uid)}
        >
            {showBefore && <DragAndDropTargetLine style={{ left: guideX(depth), top: -1 }} />}
            {showAfter && <DragAndDropTargetLine style={{ left: guideX(depth), bottom: -1 }} />}

            <div
                className={cn(
                    "group relative px-1 h-5 rounded-none select-none flex items-center gap-1 cursor-pointer",
                    !selected && "hover:bg-accent/50",
                    selected && ROW_SELECTED,
                    isDragging && "opacity-40",
                )}
                style={{ paddingLeft: (depth + 1) * INDENT + 8 }}
                onClick={() => {
                    onActivate();
                    copyEditorStore.selectedUid = uid;
                }}
            >
                <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} hasChildren={false} />
                {/* Match expander slot width so the horizontal tick reaches the icon. */}
                <span className="shrink-0 relative w-4 h-4" />
                <FileIcon className="shrink-0 relative size-3.5 text-foreground/70" />
                <span className="min-w-0 flex-1 relative truncate" title={label}>
                    {label}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 group-hover:opacity-100"
                    title="Copy this file"
                    onClick={(e) => {
                        e.stopPropagation();
                        const loc = copyEditorStore.config.groups
                            .flatMap((g) => g.items.map((it) => ({ it, g })))
                            .find(({ it }) => it.uid === uid);
                        if (loc) {
                            runCopyItem(loc.it);
                        }
                    }}
                >
                    <Copy className="size-3" />
                </Button>
            </div>
        </div>
    );
}

/** Gap between the horizontal tick and the expander (parents) or icon (leaves). */
const TREE_LINE_CONTENT_GAP = 4;
/** Expander slot is w-4; leaves keep that spacer so the tick can reach the icon. */
const TREE_EXPANDER_SLOT = 16;

/**
 * Connector lines matching the Windows tab / kibo-ui-tree: a single continuous
 * vertical (no midpoint seam) plus ancestor continuations that abut across rows.
 */
function TreeGuides({ depth, isLast, ancestors, hasChildren }: { depth: number; isLast: boolean; ancestors: boolean[]; hasChildren: boolean; }) {
    const x = guideX(depth);
    const toContent = INDENT - 8;
    const tickWidth = hasChildren
        ? toContent - TREE_LINE_CONTENT_GAP
        : toContent + TREE_EXPANDER_SLOT - TREE_LINE_CONTENT_GAP;

    return (
        <div className="absolute inset-y-0 left-0 pointer-events-none">
            {/* ancestors[i] describes the ancestor at depth i+1 (root has no guide column). */}
            {ancestors.map((cont, a) =>
                cont ? (
                    <div key={a} className="absolute inset-y-0 border-l border-foreground/40" style={{ left: guideX(a + 1) }} />
                ) : null
            )}

            {/* Full-height when a sibling follows; otherwise stop at the midpoint (no 50%/50% seam). */}
            <div
                className="absolute top-0 border-l border-foreground/40"
                style={isLast ? { left: x, height: "50%" } : { left: x, bottom: 0 }}
            />

            <div
                className="absolute top-1/2 border-t border-foreground/40"
                style={{
                    left: x,
                    width: Math.max(0, tickWidth),
                    transform: "translateY(-1px)",
                }}
            />
        </div>
    );
}

function guideX(depth: number): number {
    return depth * INDENT + 16;
}

const INDENT = 16;

function DragAndDropTargetLine({ style }: { style: React.CSSProperties; }) {
    return (
        <div className="absolute right-1 h-0.5 bg-sky-500 rounded-full pointer-events-none z-10" style={style}>
            <div className="absolute -top-0.75 size-2 bg-sky-500 rounded-full -left-1" />
        </div>
    );
}
