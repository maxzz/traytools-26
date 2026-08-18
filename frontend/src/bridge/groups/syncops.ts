import { dispatch } from "../dispatch";

const GROUP = "syncops";

export type SyncOpsRawResponse = {
    found: boolean;
    path: string;
    content?: string;
    error?: string;
};

export type SyncOpsSaveResponse = {
    path: string;
};

export type SyncOpsPickResponse = {
    canceled: boolean;
    path?: string;
};

export type SyncFolderPairRequest = {
    sourceFolder: string;
    destFolder: string;
    /** Regular expressions to skip. Omitted → backend defaults (.git, node_modules). [] → skip nothing. */
    skipPatterns?: string[];
};

export type SyncChangeDTO = {
    marker: string;
    relPath: string;
    displayName?: string;
};

export type SyncTreeNodeDTO = {
    name: string;
    fileCount: number;
    children: SyncTreeNodeDTO[];
    changes: SyncChangeDTO[];
};

export type SyncTreeReportDTO = {
    firstLevel: SyncTreeNodeDTO[];
    rootChanges: SyncChangeDTO[];
};

export type SyncCheckResponse = {
    identical: boolean;
    sourceRootLabel: string;
    sourceFileCount: number;
    folderCount: number;
    changeCount: number;
    changes: SyncChangeDTO[];
    tree: SyncTreeReportDTO;
};

export type SyncStartResponse = {
    jobId: string;
    error?: string;
};

export type SyncProgressEvent = {
    jobId: string;
    message: string;
};

export type SyncJobDoneEvent = {
    jobId: string;
    error?: string;
    sourceFileCount?: number;
    changeCount?: number;
    changes?: SyncChangeDTO[];
};

export type NormalizeDropPathResponse = {
    path: string;
};

/**
 * Sync Operations command group. Mirrors the "syncops" group on the backend bus.
 */
export const syncOpsBus = {
    getRaw: () => dispatch<SyncOpsRawResponse>(GROUP, "getRaw"),
    save: (content: string) => dispatch<SyncOpsSaveResponse>(GROUP, "save", { content }),
    pickFolder: (initialPath?: string) =>
        dispatch<SyncOpsPickResponse>(GROUP, "pickFolder", initialPath ? { initialPath } : undefined),
    importPath: () => dispatch<SyncOpsPickResponse>(GROUP, "importPath"),
    exportPath: (defaultFilename = "sync.json") =>
        dispatch<SyncOpsPickResponse>(GROUP, "exportPath", { defaultFilename }),
    readTextFile: (path: string) => dispatch<{ content: string; }>(GROUP, "readTextFile", { path }),
    writeTextFile: (path: string, content: string) =>
        dispatch<SyncOpsSaveResponse>(GROUP, "writeTextFile", { path, content }),
    normalizeDropPath: (path: string, kind: "file" | "folder" = "folder") =>
        dispatch<NormalizeDropPathResponse>(GROUP, "normalizeDropPath", { path, kind }),
    sync: (req: SyncFolderPairRequest) => dispatch<SyncStartResponse>(GROUP, "sync", req),
    check: (req: SyncFolderPairRequest) => dispatch<SyncCheckResponse>(GROUP, "check", req),
};
