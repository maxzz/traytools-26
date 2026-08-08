import { folderBaseName } from "../../a-atoms/9-types-sync";

/** Two lines: source folder name, then destination folder name. */
export function FolderPairLines({ sourceFolder, destFolder }: { sourceFolder: string; destFolder: string; }) {
    const sourceName = folderBaseName(sourceFolder) || sourceFolder;
    const destName = folderBaseName(destFolder) || destFolder;

    return (
        <div className="text-xs text-sky-600 dark:text-cyan-400 space-y-0.5">
            <div className="truncate" title={sourceFolder}>
                {sourceName}
            </div>
            <div className="truncate" title={destFolder}>
                {destName}
            </div>
        </div>
    );
}
