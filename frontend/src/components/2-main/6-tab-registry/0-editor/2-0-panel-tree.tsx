import { createContext, useContext, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { ChevronDown, ChevronRight, Folder, FolderOpen, PencilLine } from "lucide-react";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Button } from "@/ui/shadcn/button";
import { type RegItem, itemLabel } from "../a-atoms/9-types-registry";
import { type DropPosition, addDroppedRegistryFiles, copyNode, moveNode } from "../a-atoms/1-registry-editor-atoms";
import { doAsyncRegWriteGroupAtom, doAsyncRegWriteItemAtom } from "../a-atoms/2-run-registry";
import { registryEditorStore } from "../a-atoms/0-registry-local-storage";
import {
    DROP_TARGET_STYLE,
    isFileDrag,
    normalizeDroppedPaths,
    pathsFromDataTransfer,
    registerFileDropTarget,
} from "@/components/2-main/a-shared/path-input";

/** Custom MIME so OS file drags are never mistaken for in-tree reorder. */
const TREE_UID_MIME = "application/x-traytools-registry-tree-uid";

type SnapItem = {
    readonly hive: string;
    readonly keyPath: string;
    readonly valueName: string;
    readonly name?: string;
    readonly uid?: string;
};

/** Nested group in the tree snap: same shape recursively via `items`. */
type SnapGroup = {
    readonly name: string;
    readonly uid?: string;
    readonly items: readonly SnapNode[];
};

type SnapSeparator = {
    readonly separator: true;
    readonly uid?: string;
};

/** Child of a group: a registry item, nested group, or separator. */
type SnapNode = SnapItem | SnapGroup | SnapSeparator;

function isSnapSeparator(node: SnapNode): node is SnapSeparator {
    return (node as SnapSeparator).separator === true;
}

function isSnapGroup(node: SnapNode): node is SnapGroup {
    return !isSnapSeparator(node) && Array.isArray((node as SnapGroup).items) && !("keyPath" in node);
}

function isInternalTreeDrag(dt: DataTransfer): boolean {
    return [...dt.types].includes(TREE_UID_MIME);
}

function isExternalFileDrag(dt: DataTransfer): boolean {
    return isFileDrag(dt) && !isInternalTreeDrag(dt);
}

export function Panel_Tree() {
    const snap = useSnapshot(registryEditorStore);
    const groups = snap.config.groups as readonly SnapGroup[];
    const rootUid = snap.rootUid;
    const treeRef = useRef<HTMLDivElement>(null);

    const [dragUid, setDragUid] = useState<string | null>(null);
    const [dropUid, setDropUid] = useState<string | null>(null);
    const [dropPos, setDropPos] = useState<DropPosition | null>(null);
    /**
     * Dropped .reg / .json files always become a new top-level group, so the
     * whole tree is one drop zone rather than a per-row target.
     */
    const [fileDropActive, setFileDropActive] = useState(false);
    const fileDropActiveRef = useRef(false);
    // drop.ctrlKey is unreliable in WebView2; remember intent from dragover.
    const wantCopyRef = useRef(false);
    /** Dedupe Chromium File.path handling vs Wails OnFileDrop for the same gesture. */
    const lastFileApplyRef = useRef<{ sig: string; at: number; } | null>(null);

    const clearFileDrop = () => {
        fileDropActiveRef.current = false;
        setFileDropActive(false);
    };

    const markFileDrop = () => {
        fileDropActiveRef.current = true;
        setFileDropActive(true);
    };

    const applyExternalFiles = (paths: string[]) => {
        const sig = paths.join("\0");
        const now = Date.now();
        const prev = lastFileApplyRef.current;
        if (prev && prev.sig === sig && now - prev.at < 500) {
            return;
        }
        lastFileApplyRef.current = { sig, at: now };
        void addDroppedRegistryFiles(paths);
        clearFileDrop();
    };

    useEffect(
        () => {
            const el = treeRef.current;
            if (!el) {
                return;
            }
            return registerFileDropTarget({
                el,
                pathsKind: "file",
                onPaths: (paths) => applyExternalFiles(paths),
            });
        },
        []);

    const dnd = useMemo<DndState>(
        () => ({
            dragUid,
            dropUid,
            dropPos,
            onDragStart: (e, uid) => {
                setDragUid(uid);
                clearFileDrop();
                wantCopyRef.current = false;
                e.dataTransfer.effectAllowed = "copyMove";
                e.dataTransfer.setData("text/plain", uid);
                e.dataTransfer.setData(TREE_UID_MIME, uid);
            },
            onDragOver: (e, uid, isGroup, isRoot) => {
                if (isExternalFileDrag(e.dataTransfer)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    markFileDrop();
                    setDropUid(null);
                    setDropPos(null);
                    return;
                }
                if (fileDropActiveRef.current) {
                    clearFileDrop();
                }
                e.preventDefault();
                const wantCopy = e.ctrlKey || e.metaKey;
                wantCopyRef.current = wantCopy;
                e.dataTransfer.dropEffect = wantCopy ? "copy" : "move";
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
                // Do not stopPropagation — Wails window listener must see the drop.

                if (isExternalFileDrag(e.dataTransfer)) {
                    const paths = pathsFromDataTransfer(e.dataTransfer);
                    if (paths.length) {
                        void normalizeDroppedPaths(paths, "file").then((normalized) => {
                            if (normalized.length) {
                                applyExternalFiles(normalized);
                            }
                        });
                    } else {
                        // WebView2: paths arrive via Wails OnFileDrop instead.
                        clearFileDrop();
                    }
                    wantCopyRef.current = false;
                    setDragUid(null);
                    setDropUid(null);
                    setDropPos(null);
                    return;
                }

                const src =
                    e.dataTransfer.getData(TREE_UID_MIME)
                    || e.dataTransfer.getData("text/plain")
                    || dragUid;
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
                clearFileDrop();
            },
            onDragEnd: () => {
                wantCopyRef.current = false;
                setDragUid(null);
                setDropUid(null);
                setDropPos(null);
                clearFileDrop();
            },
            onDragLeaveRow: (uid) => {
                // Only clear reorder indicators; the file-drop highlight is owned by
                // the next dragover / drop / dragend so it does not flicker.
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
                        className={cn(
                            "group/tree p-1 min-h-full outline-none flex flex-col",
                            fileDropActive && "ring-1 ring-inset ring-sky-500 bg-sky-500/10",
                        )}
                        data-slot="tree-view"
                        style={DROP_TARGET_STYLE}
                        tabIndex={0}
                        onDragLeave={(e) => {
                            const related = e.relatedTarget as Node | null;
                            if (related && treeRef.current?.contains(related)) {
                                return;
                            }
                            clearFileDrop();
                        }}
                    >
                        <RootRow rootUid={rootUid} groups={groups} onActivate={focusTree} />
                        {/* Empty space below the last row still accepts reorder drops. */}
                        <div
                            className="flex-1 min-h-10"
                            onDragOver={(e) => dnd.onDragOver(e, rootUid, true, true)}
                            onDrop={(e) => dnd.onDrop(e, rootUid)}
                            onDragLeave={() => dnd.onDragLeaveRow(rootUid)}
                        />
                    </div>
                </DndContext.Provider>
            </ScrollArea>
        </div>
    );
}

function RootRow({ rootUid, groups, onActivate }: { rootUid: string; groups: readonly SnapGroup[]; onActivate: () => void; }) {
    const snap = useSnapshot(registryEditorStore);
    const dnd = useDnd();
    const [collapsed, setCollapsed] = useState(false);
    const selected = snap.selectedUid === rootUid;
    const showInside = dnd.dropUid === rootUid && dnd.dropPos === "inside";

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
                        registryEditorStore.selectedUid = rootUid;
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
                    {collapsed ? <Folder className={FOLDER_ICON} /> : <FolderOpen className={FOLDER_ICON} />}
                    <span className="flex-1 relative min-w-0 truncate">Groups</span>
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
                        <div
                            className="px-3 py-4 text-muted-foreground"
                            style={{ paddingLeft: 2 * INDENT + 8 }}
                            onDragOver={(e) => dnd.onDragOver(e, rootUid, true, true)}
                            onDrop={(e) => dnd.onDrop(e, rootUid)}
                            onDragLeave={() => dnd.onDragLeaveRow(rootUid)}
                        >
                            Empty. Drop a .reg or .json file here, or use the menu above to add groups.
                        </div>
                    )
            )}
        </div>
    );
}

function GroupRow({ group, depth, isLast, ancestors, onActivate, }: { group: SnapGroup; depth: number; isLast: boolean; ancestors: boolean[]; onActivate: () => void; }) {
    const { selectedUid } = useSnapshot(registryEditorStore);
    const writeGroup = useSetAtom(doAsyncRegWriteGroupAtom);
    const dnd = useDnd();
    const [collapsed, setCollapsed] = useState(false);
    const uid = group.uid ?? "";
    const selected = selectedUid === uid;
    const isDragging = dnd.dragUid === uid;
    const isDropTarget = dnd.dropUid === uid;
    const showBefore = isDropTarget && dnd.dropPos === "before";
    const showAfter = isDropTarget && dnd.dropPos === "after";
    const showInside = isDropTarget && dnd.dropPos === "inside";
    // ancestors[i] true ⇒ ancestor at level i has a following sibling (continue the vertical).
    const childAncestors = [...ancestors, !isLast];
    const hasChildren = group.items.length > 0;

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
                        registryEditorStore.selectedUid = uid;
                    }}
                >
                    <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} hasChildren={hasChildren} />

                    <button
                        className="shrink-0 relative w-4 h-4 text-muted-foreground flex items-center justify-center"
                        onClick={(e) => {
                            e.stopPropagation();
                            setCollapsed((v) => !v);
                        }}
                        title={collapsed ? "Expand" : "Collapse"}
                        type="button"
                    >
                        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>

                    {collapsed ? <Folder className={FOLDER_ICON} /> : <FolderOpen className={FOLDER_ICON} />}

                    <span className="flex-1 relative min-w-0 truncate">
                        {group.name || <span className="text-muted-foreground italic">(unnamed)</span>}
                    </span>

                    <Button
                        className="absolute right-1 top-1/2 size-4.5 opacity-0 bg-background group-hover:opacity-100 rounded z-10 -translate-y-1/2"
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            void writeGroup(uid);
                        }}
                        title="Write all values in this group"
                        type="button"
                    >
                        <PencilLine className="size-3" />
                    </Button>
                </div>
            </div>

            {!collapsed && group.items.map(
                (node, index) => {
                    const childIsLast = index === group.items.length - 1;
                    if (isSnapGroup(node)) {
                        return (
                            <GroupRow
                                key={node.uid}
                                group={node}
                                depth={depth + 1}
                                isLast={childIsLast}
                                ancestors={childAncestors}
                                onActivate={onActivate}
                            />
                        );
                    }
                    if (isSnapSeparator(node)) {
                        return (
                            <SeparatorRow
                                key={node.uid}
                                separator={node}
                                depth={depth + 1}
                                isLast={childIsLast}
                                ancestors={childAncestors}
                                onActivate={onActivate}
                            />
                        );
                    }
                    return (
                        <ItemRow
                            key={node.uid}
                            item={node}
                            depth={depth + 1}
                            isLast={childIsLast}
                            ancestors={childAncestors}
                            onActivate={onActivate}
                        />
                    );
                }
            )}
        </div>
    );
}

function SeparatorRow({ separator, depth, isLast, ancestors, onActivate, }: { separator: SnapSeparator; depth: number; isLast: boolean; ancestors: boolean[]; onActivate: () => void; }) {
    const snap = useSnapshot(registryEditorStore);
    const dnd = useDnd();
    const uid = separator.uid ?? "";
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
                    "group relative px-1 h-5 rounded-none select-none flex items-center gap-1 cursor-pointer",
                    !selected && "hover:bg-accent/50",
                    selected && ROW_SELECTED,
                    isDragging && "opacity-40",
                )}
                style={{ paddingLeft: (depth + 1) * INDENT + 8 }}
                onClick={() => {
                    onActivate();
                    registryEditorStore.selectedUid = uid;
                }}
            >
                <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} hasChildren={false} />

                {/* Same expander slot as ItemRow so content starts at the icon column. */}
                <span className="shrink-0 relative w-4 h-4" />

                {/*
                  Divider starts at the icon column (no negative margin) so it does
                  not cross the vertical guide. -translate-y-px matches TreeGuides'
                  horizontal tick; scoped to this span only.
                */}
                <span className="flex-1 relative -ml-2 mr-2 max-w-40 border-t border-foreground/40 -translate-y-px" />
            </div>
        </div>
    );
}

function ItemRow({ item, depth, isLast, ancestors, onActivate, }: { item: SnapItem; depth: number; isLast: boolean; ancestors: boolean[]; onActivate: () => void; }) {
    const snap = useSnapshot(registryEditorStore);
    const writeItem = useSetAtom(doAsyncRegWriteItemAtom);
    const dnd = useDnd();
    const uid = item.uid ?? "";
    const selected = snap.selectedUid === uid;
    const isDragging = dnd.dragUid === uid;
    const isDropTarget = dnd.dropUid === uid;
    const showBefore = isDropTarget && dnd.dropPos === "before";
    const showAfter = isDropTarget && dnd.dropPos === "after";
    const label = itemLabel(item as RegItem);

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
                    registryEditorStore.selectedUid = uid;
                }}
            >
                <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} hasChildren={false} />

                {/* Match expander slot width so the horizontal tick reaches the icon. */}
                <span className="shrink-0 relative w-4 h-4" />

                <SymbolAppRegedit className="shrink-0 relative size-3.5 opacity-70" />

                <span className="flex-1 relative min-w-0 truncate" title={`${item.hive}\\${item.keyPath}`}>
                    {label}
                </span>

                <Button
                    className="absolute right-1 top-1/2 size-4.5 opacity-0 bg-background group-hover:opacity-100 rounded z-10 -translate-y-1/2"
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                        e.stopPropagation();
                        void writeItem(uid);
                    }}
                    title="Write this value"
                    type="button"
                >
                    <PencilLine className="size-3" />
                </Button>
            </div>
        </div>
    );
}

const FOLDER_ICON = "shrink-0 relative size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900";

/** Same focus/unfocus selection look as the Windows tab (kibo-ui-tree). */
const ROW_SELECTED = cn(
    "text-tree-select-foreground bg-tree-select",
    "group-focus-within/tree:bg-tree-select-focused group-focus-within/tree:text-tree-select-focused-foreground",
    "group-focus-within/tree:ring-1 group-focus-within/tree:ring-inset group-focus-within/tree:ring-tree-select-border",
    "group-focus-within/tree:font-medium",
);

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
            {ancestors.map(
                (cont, a) => cont ? (
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
                style={{ left: x, width: Math.max(0, tickWidth), transform: "translateY(-1px)", }}
            />
        </div>
    );
}

function guideX(depth: number): number {
    return depth * INDENT + 16;
}

const INDENT = 16;

// Drag and drop state management

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

function DragAndDropTargetLine({ style }: { style: React.CSSProperties; }) {
    return (
        <div className="absolute right-1 h-0.5 bg-sky-500 rounded-full pointer-events-none z-10" style={style}>
            <div className="absolute -top-0.75 size-2 bg-sky-500 rounded-full -left-1" />
        </div>
    );
}
