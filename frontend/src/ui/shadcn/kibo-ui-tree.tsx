"use client";

import {
    type ComponentProps,
    createContext,
    type HTMLAttributes,
    type ReactNode,
    type RefObject,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { cn } from "@/utils/classnames";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react"; //source https://www.kibo-ui.com/components/tree //demo https://www.shadcnblocks.com/component/tree/tree-expanded-1
import { AnimatePresence, motion } from "motion/react";

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
        subscribe: (nodeId, listener) => {
            const store = storeRef.current;
            if (!store) {
                return () => undefined;
            }

            const nodeListeners =
                store.listeners.get(nodeId) ?? new Set<() => void>();
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

const useTree = () => {
    const context = useContext(TreeContext);
    if (!context) {
        throw new Error("Tree components must be used within a TreeProvider");
    }
    return context;
};

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

export type TreeProviderProps = {
    children: ReactNode;
    defaultExpandedIds?: string[];
    showLines?: boolean;
    showIcons?: boolean;
    selectable?: boolean;
    multiSelect?: boolean;
    /** When false (default), clicking an already-selected row does nothing. */
    deselectOnReselect?: boolean;
    selectedIds?: string[];
    onSelectionChange?: (selectedIds: string[]) => void;
    indent?: number;
    animateExpand?: boolean;
    className?: string;
};

export function TreeProvider({ children, defaultExpandedIds = [], showLines = true, showIcons = true, selectable = true, multiSelect = false, deselectOnReselect = false, selectedIds, onSelectionChange, indent = 20, animateExpand = true, className, }: TreeProviderProps) {
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

    useEffect(
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
        [selectable, multiSelect, deselectOnReselect, isControlled, onSelectionChange]);

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
        [
            toggleExpanded,
            handleSelection,
            showLines,
            showIcons,
            selectable,
            multiSelect,
            indent,
            animateExpand,
        ]
    );

    return (
        <TreeExpandedContext.Provider value={expandedContextValue}>
            <TreeSelectionContext.Provider value={selectionContextValue}>
                <TreeContext.Provider value={treeContextValue}>
                    <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("w-full", className)}
                        initial={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {children}
                    </motion.div>
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

    // Build the parent path - mark positions where the parent was the last child
    const currentPath = level === 0 ? [] : [...parentPath];
    if (level > 0 && parentPath.length < level - 1) {
        // Fill in missing levels with false (not last)
        while (currentPath.length < level - 1) {
            currentPath.push(false);
        }
    }
    if (level > 0) {
        currentPath[level - 1] = isLast;
    }

    return (
        <TreeNodeContext.Provider
            value={{
                nodeId,
                level,
                isLast,
                parentPath: currentPath,
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

function TreeNodeTriggerContent({
    children,
    className,
    hasChildren = false,
    isSelected,
    onClick,
    ...props
}: TreeNodeTriggerProps & { isSelected: boolean; }) {
    const { toggleExpanded, handleSelection, indent } = useTree();
    const { nodeId, level } = useTreeNode();

    return (
        <motion.div
            className={cn(
                "relative group mx-1 px-3 py-2 transition-all duration-200 rounded-md flex items-center cursor-pointer",
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
                if (hasChildren) {
                    toggleExpanded(nodeId);
                }
                handleSelection(nodeId, e.ctrlKey || e.metaKey);
                onClick?.(e);
            }}
            style={{ paddingLeft: level * (indent ?? 0) + 8 }}
            //whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
            {...props}
        >
            <TreeLines />
            {children as ReactNode}
        </motion.div>
    );
}

export function TreeLines() {
    const { showLines, indent } = useTree();
    const { level, isLast, parentPath } = useTreeNode();

    if (!showLines || level === 0) {
        return null;
    }

    return (
        <div className="absolute top-0 bottom-0 left-0 pointer-events-none">
            {/* Render vertical lines for all parent levels */}
            {Array.from({ length: level }, (_, index) => {
                const shouldHideLine = parentPath[index] === true;
                if (shouldHideLine && index === level - 1) {
                    return null;
                }

                return (
                    <div
                        className="absolute top-0 bottom-0 border-border/40 border-l"
                        key={index.toString()}
                        style={{
                            left: index * (indent ?? 0) + 12,
                            display: shouldHideLine ? "none" : "block",
                        }} />
                );
            })}

            {/* Horizontal connector line */}
            <div
                className="absolute top-1/2 border-border/40 border-t"
                style={{
                    left: (level - 1) * (indent ?? 0) + 12,
                    width: (indent ?? 0) - 4,
                    transform: "translateY(-1px)",
                }} />

            {/* Vertical line to midpoint for last items */}
            {isLast && (
                <div
                    className="absolute top-0 border-border/40 border-l"
                    style={{
                        left: (level - 1) * (indent ?? 0) + 12,
                        height: "50%",
                    }} />
            )}
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

    return (
        <AnimatePresence>
            {hasChildren && isExpanded && (
                <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{
                        duration: animateExpand ? 0.3 : 0,
                        ease: "easeInOut",
                    }}
                >
                    <motion.div
                        animate={{ y: 0 }}
                        className={className}
                        exit={{ y: -10 }}
                        initial={{ y: -10 }}
                        transition={{
                            duration: animateExpand ? 0.2 : 0,
                            delay: animateExpand ? 0.1 : 0,
                        }}
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
    const { toggleExpanded } = useTree();
    const { nodeId } = useTreeNode();
    const isExpanded = useTreeNodeExpanded(nodeId);

    if (!hasChildren) {
        return <div className="mr-1 h-4 w-4" />;
    }

    return (
        <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            className={cn(
                "mr-1 h-4 w-4 flex items-center justify-center cursor-pointer",
                className
            )}
            onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(nodeId);
                onClick?.(e);
            } }
            transition={{ duration: 0.2, ease: "easeInOut" }}
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

    const getDefaultIcon = () => hasChildren ? (
        isExpanded ? (
            <FolderOpen className="h-4 w-4" />
        ) : (
            <Folder className="h-4 w-4" />
        )
    ) : (
        <File className="h-4 w-4" />
    );

    return (
        <motion.div
            className={cn(
                "mr-2 h-4 w-4 text-muted-foreground flex items-center justify-center",
                className
            )}
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
