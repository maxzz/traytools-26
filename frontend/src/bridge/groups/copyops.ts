import { dispatch } from "../dispatch";

const GROUP = "copyops";

export type CopyOpsRawResponse = {
    found: boolean;
    path: string;
    content?: string;
    error?: string;
};

export type CopyOpsSaveResponse = {
    path: string;
};

export type CopyOpsPickResponse = {
    canceled: boolean;
    path?: string;
};

export type CopyBatchItem = {
    sourceFile: string;
    destFolder: string;
};

export type CopyBatchRequest = {
    stopDpAgent: boolean;
    requireElevated: boolean;
    renameLocked: boolean;
    items: CopyBatchItem[];
};

export type CopyBatchResponse = {
    jobId: string;
    needsElevation?: boolean;
    error?: string;
};

export type CopyItemStatus = "pending" | "skipped" | "copied" | "failed" | "renamed";

export type LockedProcess = {
    name: string;
    pid: number;
};

export type CopyItemStatusEvent = {
    jobId: string;
    index: number;
    sourceFile: string;
    destFolder: string;
    status: Exclude<CopyItemStatus, "pending">;
    error?: string;
    /** Basename (or path) the locked destination was renamed to. */
    lockedRenamedTo?: string;
    /** Processes holding the file when Access Denied / sharing violation occurs. */
    lockingProcesses?: LockedProcess[];
};

export type CopyJobDoneEvent = {
    jobId: string;
    error?: string;
};

/**
 * Copy Operations command group. Mirrors the "copyops" group on the backend bus.
 */
export type NormalizeDropPathKind = "file" | "folder";

export type NormalizeDropPathResponse = {
    path: string;
};

export const copyOpsBus = {
    getRaw: () => dispatch<CopyOpsRawResponse>(GROUP, "getRaw"),
    save: (content: string) => dispatch<CopyOpsSaveResponse>(GROUP, "save", { content }),
    pickFile: (initialPath?: string) =>
        dispatch<CopyOpsPickResponse>(GROUP, "pickFile", initialPath ? { initialPath } : undefined),
    pickFolder: (initialPath?: string) =>
        dispatch<CopyOpsPickResponse>(GROUP, "pickFolder", initialPath ? { initialPath } : undefined),
    importPath: () => dispatch<CopyOpsPickResponse>(GROUP, "importPath"),
    exportPath: (defaultFilename = "copy.json") =>
        dispatch<CopyOpsPickResponse>(GROUP, "exportPath", { defaultFilename }),
    readTextFile: (path: string) => dispatch<{ content: string; }>(GROUP, "readTextFile", { path }),
    writeTextFile: (path: string, content: string) =>
        dispatch<CopyOpsSaveResponse>(GROUP, "writeTextFile", { path, content }),
    /** Resolve .lnk targets; optionally expand .url Internet Shortcuts to their URL. */
    normalizeDropPath: (path: string, kind: NormalizeDropPathKind, opts?: { resolveUrlFile?: boolean; }) =>
        dispatch<NormalizeDropPathResponse>(GROUP, "normalizeDropPath", {
            path,
            kind,
            resolveUrlFile: opts?.resolveUrlFile ?? false,
        }),
    copyBatch: (req: CopyBatchRequest) => dispatch<CopyBatchResponse>(GROUP, "copyBatch", req),
};
