import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, FileIcon, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/utils/classnames";
import { type SyncChangeDTO, type SyncCheckResponse, type SyncTreeNodeDTO } from "@/bridge";

/** Check Details tree using the same guide-line / indent style as the Sync left panel. */
export function CheckDetailsTree({ response }: { response: SyncCheckResponse; }) {
    const tree = response.tree ?? { firstLevel: [], rootChanges: [] };
    const firstLevel = tree.firstLevel ?? [];
    const rootChanges = tree.rootChanges ?? [];
    const hasChildren = firstLevel.length > 0 || rootChanges.length > 0;

    return (
        <div className="text-xs select-text">
            <div className="mb-1.5 text-sky-600 dark:text-cyan-400">Check</div>

            <FolderRow
                name={response.sourceRootLabel || "."}
                fileCount={response.sourceFileCount}
                depth={0}
                isLast
                ancestors={[]}
                hasChildren={hasChildren}
            >
                {firstLevel.map(
                    (node, i) => {
                        const isLastFirst = i === firstLevel.length - 1 && rootChanges.length === 0;
                        return (
                            <FolderNode
                                key={`${node.name}-${i}`}
                                node={node}
                                depth={1}
                                isLast={isLastFirst}
                                ancestors={[]}
                            />
                        );
                    }
                )}
                {rootChanges.map(
                    (change, i) => (
                        <ChangeRow
                            key={`root-${change.marker}-${change.relPath}-${i}`}
                            change={change}
                            depth={1}
                            isLast={i === rootChanges.length - 1}
                            ancestors={[]}
                        />
                    )
                )}
            </FolderRow>

            {response.changeCount > 0 && (
                <div className="mt-1 text-[0.65rem] text-muted-foreground">
                    <span className="mr-4">
                        Total: {response.sourceFileCount} files in {response.folderCount} folders
                    </span>
                    Legend:{" "}
                    <span className={markerColorClass("A")}>A</span> = add,{" "}
                    <span className={markerColorClass("M")}>M</span> = modify,{" "}
                    <span className={markerColorClass("D")}>D</span> = delete
                </div>
            )}
        </div>
    );
}

function FolderNode({ node, depth, isLast, ancestors }: { node: SyncTreeNodeDTO; depth: number; isLast: boolean; ancestors: boolean[]; }) {
    const children = node.children ?? [];
    const changes = node.changes ?? [];
    const childAncestors = [...ancestors, !isLast];
    const hasChildren = children.length > 0 || changes.length > 0;

    return (
        <FolderRow
            name={node.name}
            fileCount={node.fileCount}
            depth={depth}
            isLast={isLast}
            ancestors={ancestors}
            hasChildren={hasChildren}
        >
            {children.map(
                (child, i) => {
                    const childIsLast = i === children.length - 1 && changes.length === 0;
                    const nestedChanges = child.changes ?? [];
                    return (
                        <FolderRow
                            key={`${child.name}-${i}`}
                            name={child.name}
                            fileCount={child.fileCount}
                            depth={depth + 1}
                            isLast={childIsLast}
                            ancestors={childAncestors}
                            hasChildren={nestedChanges.length > 0}
                        >
                            {nestedChanges.map(
                                (change, ci) => (
                                    <ChangeRow
                                        key={`${change.marker}-${change.relPath}-${ci}`}
                                        change={change}
                                        depth={depth + 2}
                                        isLast={ci === nestedChanges.length - 1}
                                        ancestors={[...childAncestors, !childIsLast]}
                                    />
                                )
                            )}
                        </FolderRow>
                    );
                }
            )}
            {changes.map(
                (change, i) => (
                    <ChangeRow
                        key={`${change.marker}-${change.relPath}-${i}`}
                        change={change}
                        depth={depth + 1}
                        isLast={i === changes.length - 1}
                        ancestors={childAncestors}
                    />
                )
            )}
        </FolderRow>
    );
}

function FolderRow({ name, fileCount, depth, isLast, ancestors, hasChildren, children }: { name: string; fileCount: number; depth: number; isLast: boolean; ancestors: boolean[]; hasChildren: boolean; children?: ReactNode; }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div>
            <div
                className="relative px-1 h-5 rounded-none select-none flex items-center gap-1"
                style={{ paddingLeft: (depth + 1) * INDENT + 8 }}
            >
                <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} hasChildren={hasChildren} />

                <button
                    type="button"
                    className="shrink-0 relative w-4 h-4 text-muted-foreground flex items-center justify-center disabled:opacity-40"
                    title={hasChildren ? (collapsed ? "Expand" : "Collapse") : undefined}
                    onClick={() => setCollapsed((v) => !v)}
                    disabled={!hasChildren}
                >
                    {hasChildren
                        ? (collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />)
                        : <span className="w-4 h-4" />}
                </button>

                {collapsed || !hasChildren
                    ? <Folder className="shrink-0 relative size-3.5 text-yellow-900 fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                    : <FolderOpen className="shrink-0 relative size-3.5 text-yellow-900 fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                }

                <span className="relative min-w-0 truncate">
                    {name}
                    {" "}
                    <span className="text-muted-foreground">({fileCount} files)</span>
                </span>
            </div>

            {!collapsed && hasChildren && children}
        </div>
    );
}

function ChangeRow({ change, depth, isLast, ancestors }: { change: SyncChangeDTO; depth: number; isLast: boolean; ancestors: boolean[]; }) {
    const marker = (change.marker || "?").slice(0, 1).toUpperCase();
    const name = change.displayName || change.relPath || "";
    const color = markerColorClass(marker);

    return (
        <div
            className="relative px-1 h-5 rounded-none select-none flex items-center gap-1"
            style={{ paddingLeft: (depth + 1) * INDENT + 8 }}
        >
            <TreeGuides depth={depth} isLast={isLast} ancestors={ancestors} hasChildren={false} />

            <span className="shrink-0 relative w-4 h-4" />
            <FileIcon className={cn("shrink-0 relative size-3.5", color || "text-foreground/70")} />
            <span className="relative min-w-0 truncate">
                File:{" "}
                <span className={cn(color)}>
                    {marker} {name}
                </span>
            </span>
        </div>
    );
}

/** Connector lines matching the Sync left panel / kibo-ui-tree. */
function TreeGuides({ depth, isLast, ancestors, hasChildren }: { depth: number; isLast: boolean; ancestors: boolean[]; hasChildren: boolean; }) {
    if (depth <= 0) {
        return null;
    }

    const x = guideX(depth);
    const toContent = INDENT - 8;
    const tickWidth = hasChildren
        ? toContent - TREE_LINE_CONTENT_GAP
        : toContent + TREE_EXPANDER_SLOT - TREE_LINE_CONTENT_GAP;

    return (
        <div className="absolute inset-y-0 left-0 pointer-events-none">
            {ancestors.map(
                (cont, a) => cont ? (
                    <div key={a} className="absolute inset-y-0 border-l border-foreground/40" style={{ left: guideX(a + 1) }} />
                ) : null
            )}

            <div
                className="absolute top-0 border-l border-foreground/40"
                style={isLast ? { left: x, height: "50%" } : { left: x, bottom: 0 }}
            />

            <div
                className="absolute top-1/2 border-t border-foreground/40"
                style={{ left: x, width: Math.max(0, tickWidth), transform: "translateY(-1px)" }}
            />
        </div>
    );
}

function guideX(depth: number): number {
    return depth * INDENT + 16;
}

const INDENT = 16;
const TREE_LINE_CONTENT_GAP = 4;
const TREE_EXPANDER_SLOT = 16;

function markerColorClass(marker: string): string {
    switch (marker) {
        case "A":
            return "text-emerald-600 dark:text-emerald-400";
        case "M":
            return "text-amber-600 dark:text-amber-400";
        case "D":
            return "text-red-600 dark:text-red-400";
        default:
            return "";
    }
}
