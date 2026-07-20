import { createContext, useContext, useMemo, useState, type DragEvent } from "react";
import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { ChevronDown, ChevronRight, Copy, Folder, FolderOpen, FileIcon } from "lucide-react";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Button } from "@/ui/shadcn/button";
import { itemLabel, type CopyOpItem } from "@/components/2-main/5-tab-copy-operations/a-atoms/9-types-copy";
import { type DropPosition, moveNode } from "@/components/2-main/5-tab-copy-operations/a-atoms/1-copy-editor-atoms";
import { copyEditorStore } from "@/components/2-main/5-tab-copy-operations/a-atoms/0-copy-local-storage";
import { runCopyItem } from "@/components/2-main/5-tab-copy-operations/a-atoms/2-run-copy";

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

    return (
        <div className="min-h-0 h-full flex flex-col">
            <ScrollArea className="flex-1 min-h-0">
                <DndContext.Provider value={dnd}>
                    <div className="p-1">
                        <RootRow rootUid={rootUid} groups={groups} />
                    </div>
                </DndContext.Provider>
            </ScrollArea>
        </div>
    );
}

function RootRow({ rootUid, groups }: { rootUid: string; groups: readonly SnapGroup[]; }) {
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
                        "group relative pr-1 h-5 hover:bg-accent/60 rounded-md select-none flex items-center gap-1 cursor-pointer font-medium",
                        selected && "bg-accent text-accent-foreground",
                        showInside && "ring-1 ring-sky-500 bg-sky-500/10",
                    )}
                    style={{ paddingLeft: INDENT + 6 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setCollapsed((v) => !v);
                        copyEditorStore.selectedUid = rootUid;
                    }}
                >
                    <button className="shrink-0 relative w-3 h-4 text-muted-foreground flex items-center justify-center" title={collapsed ? "Expand" : "Collapse"}>
                        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
                    {collapsed
                        ? <Folder className="shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                        : <FolderOpen className="shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                    }
                    <span className="flex-1 relative truncate">Groups</span>
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
                                />
                            ))}
                        </div>
                    )
                    : (
                        <div className="px-3 py-4 text-muted-foreground" style={{ paddingLeft: 2 * INDENT + 6 }}>
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
}: {
    group: SnapGroup;
    depth: number;
    isLast: boolean;
    ancestors: boolean[];
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
                        "group relative pr-1 h-5 hover:bg-accent/60 rounded-md select-none flex items-center gap-1 cursor-pointer",
                        selected && "bg-accent text-accent-foreground",
                        showInside && "ring-1 ring-sky-500 bg-sky-500/10",
                        isDragging && "opacity-40",
                    )}
                    style={{ paddingLeft: (depth + 1) * INDENT + 6 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setCollapsed((v) => !v);
                        copyEditorStore.selectedUid = uid;
                    }}
                >
                    <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} isGroup />
                    <button className="shrink-0 relative w-3 h-4 text-muted-foreground flex items-center justify-center">
                        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
                    {collapsed
                        ? <Folder className="shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                        : <FolderOpen className="shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                    }
                    <span className="flex-1 relative truncate">{group.name || <span className="text-muted-foreground italic">(unnamed)</span>}</span>
                </div>
            </div>

            {!collapsed && group.items.map((item, index) => (
                <ItemRow
                    key={item.uid}
                    item={item}
                    depth={depth + 1}
                    isLast={index === group.items.length - 1}
                    ancestors={childAncestors}
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
}: {
    item: SnapItem;
    depth: number;
    isLast: boolean;
    ancestors: boolean[];
}) {
    const snap = useSnapshot(copyEditorStore);
    const dnd = useDnd();
    const uid = item.uid ?? "";
    const selected = snap.selectedUid === uid;
    const isDragging = dnd.dragUid === uid;
    const isDropTarget = dnd.dropUid === uid;
    const showBefore = isDropTarget && dnd.dropPos === "before";
    const showAfter = isDropTarget && dnd.dropPos === "after";

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
                    "group relative pr-1 h-5 hover:bg-accent/60 rounded-md select-none flex items-center gap-1 cursor-pointer",
                    selected && "bg-accent text-accent-foreground",
                    isDragging && "opacity-40",
                )}
                style={{ paddingLeft: (depth + 1) * INDENT + 6 }}
                onClick={() => { copyEditorStore.selectedUid = uid; }}
            >
                <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} isGroup={false} />
                <span className="shrink-0 relative size-px" />
                <FileIcon className="shrink-0 relative size-3.5 text-foreground/70" />
                <span className="flex-1 relative truncate">
                    {itemLabel(item as CopyOpItem)}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 shrink-0"
                    title="Copy this file"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Resolve live proxy item for flags
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

function TreeGuides({ depth, isLast, ancestors, isGroup }: { depth: number; isLast: boolean; ancestors: boolean[]; isGroup: boolean; }) {
    const x = guideX(depth);
    return (
        <div className="absolute inset-y-0 left-0 pointer-events-none">
            {ancestors.map((cont, a) => cont ? <span key={a} className="absolute top-0 bottom-0 border-l border-foreground/40" style={{ left: guideX(a) }} /> : null)}
            <span className="absolute top-0 border-l border-foreground/40" style={{ left: x, height: "50%" }} />
            {!isLast && <span className="absolute bottom-0 border-l border-foreground/40" style={{ left: x, top: "50%" }} />}
            <span className="absolute top-1/2 border-t border-foreground/40" style={{ left: x, width: isGroup ? INDENT - 6 : INDENT - 3 }} />
        </div>
    );
}

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
