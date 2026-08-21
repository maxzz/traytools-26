"use client"; // 08.20.26
import { type ComponentProps, type HTMLAttributes, type ReactNode, type RefObject, createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, } from "react";
import { cn } from "@/utils/classnames";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react"; //source https://www.kibo-ui.com/components/tree //demo https://www.shadcnblocks.com/component/tree/tree-expanded-1

//---------------------------------------------------------------------------
// TreeContext

type TreeContextType = {
    toggleExpanded: (nodeId: string) => void;
    handleSelection: (nodeId: string, ctrlKey: boolean) => void;
    showLines?: boolean;
    showIcons?: boolean;
    selectable?: boolean;
    multiSelect?: boolean;
    indent?: number;
    animateExpand?: boolean;
};

const TreeContext = createContext<TreeContextType | undefined>(undefined);

const useTree = () => {
    const context = useContext(TreeContext);
    if (!context) {
        throw new Error("Tree components must be used within a TreeProvider");
    }
    return context;
};

//---------------------------------------------------------------------------
// TreeNodeContext

type TreeNodeContextType = {
    nodeId: string;
    level: number;
    isLast: boolean;
    parentPath: boolean[];
};

const TreeNodeContext = createContext<TreeNodeContextType | undefined>(
    undefined
);

const useTreeNode = () => {
    const context = useContext(TreeNodeContext);
    if (!context) {
        throw new Error("TreeNode components must be used within a TreeNode");
    }
    return context;
};

//---------------------------------------------------------------------------
//

type TreeNodeSubscriptionStore = {
    listeners: Map<string, Set<() => void>>;
};

type TreeSelectionStore = TreeNodeSubscriptionStore & {
    selectedIds: string[];
};

type TreeExpandedStore = TreeNodeSubscriptionStore & {
    expandedIds: Set<string>;
};

type TreeNodeSubscriptionContextType = {
    subscribe: (nodeId: string, listener: () => void) => () => void;
    getSnapshot: (nodeId: string) => boolean;
};

const TreeSelectionContext = createContext<TreeNodeSubscriptionContextType | undefined>(undefined);

const TreeExpandedContext = createContext<TreeNodeSubscriptionContextType | undefined>(undefined);

function applySelectionChange(store: TreeSelectionStore, newSelection: string[]) {
    const affected = new Set([...store.selectedIds, ...newSelection]);
    store.selectedIds = newSelection;
    notifyNodeListeners(store, affected);
}

function toggleExpandedInStore(store: TreeExpandedStore, nodeId: string) {
    const nextExpandedIds = new Set(store.expandedIds);
    if (nextExpandedIds.has(nodeId)) {
        nextExpandedIds.delete(nodeId);
    } else {
        nextExpandedIds.add(nodeId);
    }
    store.expandedIds = nextExpandedIds;
    notifyNodeListeners(store, [nodeId]);
}

function notifyNodeListeners(store: TreeNodeSubscriptionStore, nodeIds: Iterable<string>) {
    for (const nodeId of nodeIds) {
        store.listeners.get(nodeId)?.forEach((listener) => listener());
    }
}

function createNodeSubscriptionContext(storeRef: RefObject<TreeNodeSubscriptionStore | null>, getSnapshot: (nodeId: string) => boolean): TreeNodeSubscriptionContextType {
    return {
        subscribe:
            (nodeId, listener) => {
                const store = storeRef.current;
                if (!store) {
                    return () => undefined;
                }

                const nodeListeners = store.listeners.get(nodeId) ?? new Set<() => void>();
                nodeListeners.add(listener);
                store.listeners.set(nodeId, nodeListeners);

                return () => {
                    nodeListeners.delete(listener);
                    if (nodeListeners.size === 0) {
                        store.listeners.delete(nodeId);
                    }
                };
            },
        getSnapshot,
    };
}

function useTreeNodeSelected(nodeId: string) {
    const selection = useContext(TreeSelectionContext);
    if (!selection) {
        throw new Error("TreeNodeTrigger must be used within a TreeProvider");
    }

    return useSyncExternalStore(
        (listener) => selection.subscribe(nodeId, listener),
        () => selection.getSnapshot(nodeId)
    );
}

function useTreeNodeExpanded(nodeId: string) {
    const expanded = useContext(TreeExpandedContext);
    if (!expanded) {
        throw new Error("Tree components must be used within a TreeProvider");
    }

    return useSyncExternalStore(
        (listener) => expanded.subscribe(nodeId, listener),
        () => expanded.getSnapshot(nodeId)
    );
}

//

export type TreeProviderProps = {
    children: ReactNode;
    defaultExpandedIds?: string[];
    showLines?: boolean;
    showIcons?: boolean;
    selectable?: boolean;
    multiSelect?: boolean;                 // Allow multiple selection.
    deselectOnReselect?: boolean;          // When false (default), clicking an already-selected row does nothing.
    selectedIds?: string[];                // Controlled selection.
    onSelectionChange?: (selectedIds: string[]) => void;
    onReselect?: (nodeId: string) => void; // Fired when a selected row is clicked again and deselectOnReselect is false.
    indent?: number;                       // Indentation width.
    animateExpand?: boolean;               // Expand/collapse height animation. Off unless the prop is passed as true.
    animateAppear?: boolean;               // Mount slide (opacity + y). Off unless the prop is passed as true.
    className?: string;
};

export function TreeProvider({
    children, defaultExpandedIds = [], showLines = true, showIcons = true, selectable = true, multiSelect = false, deselectOnReselect = false,
    selectedIds, onSelectionChange, onReselect, indent = 20, animateExpand, animateAppear, className,
}: TreeProviderProps) {
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds ?? []);
    const selectionStoreRef = useRef<TreeSelectionStore>({
        selectedIds: selectedIds ?? [],
        listeners: new Map(),
    });
    const expandedStoreRef = useRef<TreeExpandedStore>({ expandedIds: new Set(defaultExpandedIds), listeners: new Map(), });

    const isControlled = onSelectionChange !== undefined;
    const currentSelectedIds = selectedIds ?? internalSelectedIds;
    const selectedIdsRef = useRef(currentSelectedIds);
    selectedIdsRef.current = currentSelectedIds;

    // Sync before paint so controlled selection does not flash the previous
    // highlight for a frame (noticeable during process back/forward nav).
    useLayoutEffect(
        () => {
            if (selectedIds === undefined) {
                return;
            }

            const store = selectionStoreRef.current;
            const prev = store.selectedIds;
            if (prev.length === selectedIds.length &&
                prev.every((id, index) => id === selectedIds[index])) {
                return;
            }

            selectedIdsRef.current = selectedIds;
            applySelectionChange(store, selectedIds);
        },
        [selectedIds]);

    const selectionContextValue = useMemo(
        () => createNodeSubscriptionContext(
            selectionStoreRef,
            (nodeId) => selectionStoreRef.current.selectedIds.includes(nodeId)
        ),
        []);

    const expandedContextValue = useMemo(
        () => createNodeSubscriptionContext(
            expandedStoreRef,
            (nodeId) => expandedStoreRef.current.expandedIds.has(nodeId)
        ),
        []);

    const toggleExpanded = useCallback(
        (nodeId: string) => {
            toggleExpandedInStore(expandedStoreRef.current, nodeId);
        },
        []);

    const handleSelection = useCallback(
        (nodeId: string, ctrlKey = false) => {
            if (!selectable) {
                return;
            }

            const current = selectedIdsRef.current;
            let newSelection: string[];

            if (multiSelect && ctrlKey) {
                newSelection = current.includes(nodeId)
                    ? current.filter((id) => id !== nodeId)
                    : [...current, nodeId];
            } else if (current.includes(nodeId)) {
                if (!deselectOnReselect) {
                    onReselect?.(nodeId);
                    return;
                }
                newSelection = [];
            } else {
                newSelection = [nodeId];
            }

            selectedIdsRef.current = newSelection;
            applySelectionChange(selectionStoreRef.current, newSelection);

            if (isControlled) {
                onSelectionChange?.(newSelection);
            } else {
                setInternalSelectedIds(newSelection);
            }
        },
        [selectable, multiSelect, deselectOnReselect, isControlled, onSelectionChange, onReselect]);

    const treeContextValue = useMemo(
        () => ({
            toggleExpanded,
            handleSelection,
            showLines,
            showIcons,
            selectable,
            multiSelect,
            indent,
            animateExpand,
        }),
        [toggleExpanded, handleSelection, showLines, showIcons, selectable, multiSelect, indent, animateExpand]);

    return (
        <TreeExpandedContext.Provider value={expandedContextValue}>
            <TreeSelectionContext.Provider value={selectionContextValue}>
                <TreeContext.Provider value={treeContextValue}>
                    {animateAppear
                        ? (
                            <motion.div
                                className={cn("w-full", className)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                {children}
                            </motion.div>
                        )
                        : (
                            <div className={cn("w-full", className)}>
                                {children}
                            </div>
                        )
                    }
                </TreeContext.Provider>
            </TreeSelectionContext.Provider>
        </TreeExpandedContext.Provider>
    );
}

export type TreeViewProps = HTMLAttributes<HTMLDivElement>;

export function TreeView({ className, children, ...props }: TreeViewProps) {
    return (
        <div
            className={cn("group/tree p-2 outline-none", className)}
            data-slot="tree-view"
            tabIndex={0}
            {...props}
        >
            {children}
        </div>
    );
}

export type TreeNodeProps = HTMLAttributes<HTMLDivElement> & {
    nodeId?: string;
    level?: number;
    isLast?: boolean;
    parentPath?: boolean[];
    children?: ReactNode;
};

export function TreeNode({ nodeId: providedNodeId, level = 0, isLast = false, parentPath = [], children, className, onClick, ...props }: TreeNodeProps) {
    const generatedId = useId();
    const nodeId = providedNodeId ?? generatedId;

    // Ancestor path: parentPath[i] is true when the ancestor at level i was the last child.
    const ancestorPath = level === 0 ? [] : [...parentPath];
    if (level > 0 && ancestorPath.length < level) {
        while (ancestorPath.length < level) {
            ancestorPath.push(false);
        }
    }

    return (
        <TreeNodeContext.Provider
            value={{
                nodeId,
                level,
                isLast,
                parentPath: ancestorPath,
            }}
        >
            <div className={cn("select-none", className)} {...props}>
                {children}
            </div>
        </TreeNodeContext.Provider>
    );
}

export type TreeNodeTriggerProps = ComponentProps<typeof motion.div> & {
    isSelected?: boolean;
    hasChildren?: boolean;
};

export function TreeNodeTrigger({ isSelected: isSelectedProp, ...props }: TreeNodeTriggerProps) {
    if (isSelectedProp !== undefined) {
        return <TreeNodeTriggerContent isSelected={isSelectedProp} {...props} />;
    }

    return <TreeNodeTriggerWithInternalSelection {...props} />;
}

function TreeNodeTriggerWithInternalSelection(props: TreeNodeTriggerProps) {
    const { nodeId } = useTreeNode();
    const isSelected = useTreeNodeSelected(nodeId);

    return <TreeNodeTriggerContent isSelected={isSelected} {...props} />;
}

function TreeNodeTriggerContent({ children, className, hasChildren = false, isSelected, onClick, ...props }: TreeNodeTriggerProps & { isSelected: boolean; }) {
    const { handleSelection, indent } = useTree();
    const { nodeId, level } = useTreeNode();

    return (
        <motion.div
            className={cn(
                "relative group mx-1 px-3 py-0.5 transition-all duration-200 rounded-none flex items-center cursor-pointer",
                !isSelected && "hover:bg-accent/50",
                isSelected && "bg-tree-select text-tree-select-foreground",
                isSelected && "group-focus-within/tree:bg-tree-select-focused group-focus-within/tree:text-tree-select-focused-foreground",
                isSelected && "group-focus-within/tree:ring-1 group-focus-within/tree:ring-inset group-focus-within/tree:ring-tree-select-border",
                isSelected && "group-focus-within/tree:font-medium",
                className
            )}
            data-selected={isSelected ? "" : undefined}
            onClick={(e) => {
                (e.currentTarget.closest("[data-slot=tree-view]") as HTMLElement | null)?.focus();
                handleSelection(nodeId, e.ctrlKey || e.metaKey);
                onClick?.(e);
            }}
            style={{ paddingLeft: (level + 1) * (indent ?? 0) + 8 }}
            //whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
            {...props}
        >
            <TreeLines hasChildren={hasChildren} />
            {children as ReactNode}
        </motion.div>
    );
}

/** Gap between the horizontal tick and the expander (parents) or icon (leaves). */
const TREE_LINE_CONTENT_GAP = 4;
/** TreeExpander is w-4 + mr-1; leaves keep that spacer so the tick can reach the icon. */
const TREE_EXPANDER_SLOT = 16 + 4;

export function TreeLines({ hasChildren = false }: { hasChildren?: boolean; }) {
    const { showLines, indent } = useTree();
    const { level, isLast, parentPath } = useTreeNode();

    if (!showLines || level === 0) {
        return null;
    }

    const indentPx = indent ?? 0;
    const guideX = (depth: number) => depth * indentPx + 16;
    const x = guideX(level);
    // Distance from the vertical guide to the row content (paddingLeft).
    const toContent = indentPx - 8;
    // Parents: stop ~4px before the chevron. Leaves: extend through the empty expander to ~4px before the icon.
    const tickWidth = hasChildren
        ? toContent - TREE_LINE_CONTENT_GAP
        : toContent + TREE_EXPANDER_SLOT - TREE_LINE_CONTENT_GAP;

    return (
        <div className="absolute inset-y-0 left-0 pointer-events-none">
            {/* Ancestor continuation at columns 0..level-1. Rows abut, so bottom:0 meets the next row's top:0 with no gap/overlap. */}
            {parentPath.map((ancestorIsLast, index) =>
                !ancestorIsLast ? (
                    <div className="absolute inset-y-0 border-foreground/40 border-l" style={{ left: guideX(index) }} key={index} />
                ) : null
            )}

            {/* Current level: full-height when a sibling follows; otherwise stop at the midpoint. */}
            <div
                className="absolute top-0 border-foreground/40 border-l"
                style={isLast ? { left: x, height: "50%" } : { left: x, bottom: 0 }}
            />

            {/* Horizontal tick reaching toward the row content. */}
            <div
                className="absolute top-1/2 border-foreground/40 border-t"
                style={{
                    left: x,
                    width: Math.max(0, tickWidth),
                    transform: "translateY(-1px)",
                }}
            />
        </div>
    );
}

export type TreeNodeContentProps = ComponentProps<typeof motion.div> & {
    hasChildren?: boolean;
};

export function TreeNodeContent({ children, hasChildren = false, className, ...props }: TreeNodeContentProps) {
    const { animateExpand } = useTree();
    const { nodeId } = useTreeNode();
    const isExpanded = useTreeNodeExpanded(nodeId);

    // Instant expand/collapse: skip Motion so remounts (refresh, filter) do not
    // play height/y enter animations that make the tree slide or grow.
    if (!animateExpand) {
        if (!hasChildren || !isExpanded) {
            return null;
        }
        return (
            <div className={className}>
                {children as ReactNode}
            </div>
        );
    }

    return (
        <AnimatePresence initial={false}>
            {hasChildren && isExpanded && (
                <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                    <motion.div
                        animate={{ y: 0 }}
                        className={className}
                        exit={{ y: -10 }}
                        initial={{ y: -10 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        {...props}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export type TreeExpanderProps = ComponentProps<typeof motion.div> & {
    hasChildren?: boolean;
};

export function TreeExpander({ hasChildren = false, className, onClick, ...props }: TreeExpanderProps) {
    const { toggleExpanded, animateExpand } = useTree();
    const { nodeId } = useTreeNode();
    const isExpanded = useTreeNodeExpanded(nodeId);

    if (!hasChildren) {
        return <div className="mr-1 h-4 w-4" />;
    }

    return (
        <motion.div
            className={cn("mr-1 h-4 w-4 flex items-center justify-center cursor-pointer", className)}
            animate={{ rotate: isExpanded ? 90 : 0 }}
            initial={false}
            transition={{ duration: animateExpand ? 0.2 : 0, ease: "easeInOut" }}
            onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(nodeId);
                onClick?.(e);
            }}
            {...props}
        >
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </motion.div>
    );
}

export type TreeIconProps = ComponentProps<typeof motion.div> & {
    icon?: ReactNode;
    hasChildren?: boolean;
};

export function TreeIcon({ icon, hasChildren = false, className, ...props }: TreeIconProps) {
    const { showIcons } = useTree();
    const { nodeId } = useTreeNode();
    const isExpanded = useTreeNodeExpanded(nodeId);

    if (!showIcons) {
        return null;
    }

    function getDefaultIcon() {
        const rv =
            hasChildren
                ? isExpanded
                    ? <FolderOpen className="size-3.5" />
                    : <Folder className="size-3.5" />
                : <File className="size-3.5" />;
        return rv;
    }

    return (
        <motion.div
            className={cn("mr-1 size-4 text-muted-foreground flex items-center justify-center", className)}
            transition={{ duration: 0.15 }}
            whileHover={{ scale: 1.1 }}
            {...props}
        >
            {icon || getDefaultIcon()}
        </motion.div>
    );
}

export type TreeLabelProps = HTMLAttributes<HTMLSpanElement>;

export function TreeLabel({ className, ...props }: TreeLabelProps) {
    return (
        <span className={cn("text-sm truncate flex-1 font", className)} {...props} />
    );
}
