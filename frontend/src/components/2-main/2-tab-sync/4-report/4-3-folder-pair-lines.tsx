import { type SyncCheckResponse } from "@/bridge";
import { folderBaseName } from "../a-atoms/9-types-sync";
import { ChangeBreakdown } from "./4-4-change-breakdown";

/** Two lines: source folder name, then destination folder name. */
export function FolderPairLines({ sourceFolder, destFolder }: { sourceFolder: string; destFolder: string; }) {
    const sourceName = folderBaseName(sourceFolder) || sourceFolder;
    const destName = folderBaseName(destFolder) || destFolder;

    return (
        <div className="text-xs text-sky-600 dark:text-cyan-400 space-y-0.5">
            <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Source:</span>
                <div className="truncate" title={sourceFolder}>
                    {sourceName}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Destination:</span>
                <div className="truncate" title={destFolder}>
                    {destName}
                </div>
            </div>
        </div>
    );
}

export function JobSummary({ response }: { response: SyncCheckResponse; }) {
    if (response.changeCount <= 0) {
        return null;
    }

    return (
        <div className="mt-1 text-[0.65rem] text-muted-foreground">
            <span className="mr-4">
                Total: {response.changeCount} update{response.changeCount === 1 ? "" : "s"}
                {" "}({response.sourceFileCount} files in {response.folderCount} folders:{" "}
                <ChangeBreakdown changes={response.changes} />)
            </span>
        </div>
    );
}
