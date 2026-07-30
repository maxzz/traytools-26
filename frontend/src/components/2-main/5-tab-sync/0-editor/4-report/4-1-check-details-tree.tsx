import { cn } from "@/utils/classnames";
import { type SyncChangeDTO, type SyncCheckResponse, type SyncTreeNodeDTO } from "@/bridge";

/** CLI-format Check Details tree (matches copy-no-nm -c / BuildTreeReport). */
export function CheckDetailsTree({ response }: { response: SyncCheckResponse; }) {
    const tree = response.tree ?? { firstLevel: [], rootChanges: [] };
    const firstLevel = tree.firstLevel ?? [];
    const rootChanges = tree.rootChanges ?? [];
    const hasRootFiles = rootChanges.length > 0;

    return (
        <div className="font-mono text-xs leading-none whitespace-pre select-text">
            <div className="text-sky-600 dark:text-cyan-400 leading-5">Check</div>
            <div className="h-2" />
            <div className="leading-none">
                {response.sourceRootLabel || "."}
                {" "}
                <span className="text-muted-foreground">({response.sourceFileCount} files)</span>
            </div>

            <div className="leading-none [&>div]:leading-none">
                {firstLevel.map(
                    (node, i) => {
                        const isLastFirst = i === firstLevel.length - 1;
                        const moreAfter = hasRootFiles || !isLastFirst;
                        const branch = isLastFirst && !hasRootFiles ? "└──" : "├──";
                        const cont = isLastFirst && !hasRootFiles ? "    " : "│   ";
                        return (
                            <FirstLevelBlock
                                key={`${node.name}-${i}`}
                                node={node}
                                branch={branch}
                                cont={cont}
                                moreAfter={moreAfter}
                                isLastFirst={isLastFirst}
                                hasRootFiles={hasRootFiles}
                            />
                        );
                    }
                )}

                {hasRootFiles && (
                    <FileChangeLines cont="" changes={rootChanges} blockEnds />
                )}
            </div>

            <div className="mt-2 leading-5 text-muted-foreground">
                Total: {response.sourceFileCount} files in {response.folderCount} folders
            </div>
            {response.changeCount > 0 && (
                <div className="leading-5 text-muted-foreground">
                    Required updates: A = add, M = modify, D = delete
                </div>
            )}
        </div>
    );
}

function FirstLevelBlock({ node, branch, cont, moreAfter, isLastFirst, hasRootFiles }: { node: SyncTreeNodeDTO; branch: string; cont: string; moreAfter: boolean; isLastFirst: boolean; hasRootFiles: boolean; }) {
    const children = node.children ?? [];
    const changes = node.changes ?? [];

    if (children.length > 0) {
        return (<>
            <FolderLine prefix={branch} name={node.name} fileCount={node.fileCount} />
            <SecondLevelBlock cont={cont} node={node} moreAfter={moreAfter} />
        </>);
    }

    return (<>
        <FolderLine prefix={branch} name={node.name} fileCount={node.fileCount} />
        {changes.length > 0 && (
            <FileChangeLines
                cont={cont}
                changes={changes}
                blockEnds={isLastFirst && !hasRootFiles}
            />
        )}
    </>);
}

function SecondLevelBlock({ node, cont, moreAfter }: { node: SyncTreeNodeDTO; cont: string; moreAfter: boolean; }) {
    const children = node.children ?? [];
    const changes = node.changes ?? [];

    return (<>
        {children.map(
            (child, i) => {
                const isLastChild = i === children.length - 1;
                const branch = isLastChild ? "└──" : "├──";
                const childCont = cont + (isLastChild ? "    " : "│   ");
                return (
                    <div key={`${child.name}-${i}`}>
                        <FolderLine prefix={cont + branch} name={child.name} fileCount={child.fileCount} />
                        <FileChangeLines cont={childCont} changes={child.changes ?? []} blockEnds />
                    </div>
                );
            }
        )}
        {changes.length > 0 && (
            <FileChangeLines cont={cont} changes={changes} blockEnds={!moreAfter} />
        )}
    </>);
}

function FolderLine({ prefix, name, fileCount }: { prefix: string; name: string; fileCount: number; }) {
    return (
        <div className="leading-none">
            {prefix}{name}{" "}
            <span className="text-muted-foreground">({fileCount} files)</span>
        </div>
    );
}

function FileChangeLines({ cont, changes, blockEnds }: { cont: string; changes: SyncChangeDTO[]; blockEnds: boolean; }) {
    return (<>
        {changes.map(
            (change, i) => {
                const isLast = i === changes.length - 1;
                const branch = isLast && blockEnds ? "└──" : "├──";
                return (
                    <div key={`${change.marker}-${change.relPath}-${i}`} className="leading-none">
                        {cont}{branch}
                        <FileChangeText change={change} />
                    </div>
                );
            }
        )}
    </>);
}

function FileChangeText({ change }: { change: SyncChangeDTO; }) {
    const marker = (change.marker || "?").slice(0, 1);
    const name = change.displayName || change.relPath || "";
    return (
        <span>
            File:{" "}
            <span className={cn(markerColorClass(marker))}>
                {marker} {name}
            </span>
        </span>
    );
}

function markerColorClass(marker: string): string {
    switch (marker.toUpperCase()) {
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
