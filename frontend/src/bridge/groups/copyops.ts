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
    items: CopyBatchItem[];
};

export type CopyBatchResponse = {
    jobId: string;
    needsElevation?: boolean;
    error?: string;
};

export type CopyItemStatus = "pending" | "skipped" | "copied" | "failed";

export type CopyItemStatusEvent = {
    jobId: string;
    index: number;
    sourceFile: string;
    destFolder: string;
    status: Exclude<CopyItemStatus, "pending">;
    error?: string;
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
    pickFile: () => dispatch<CopyOpsPickResponse>(GROUP, "pickFile"),
    pickFolder: () => dispatch<CopyOpsPickResponse>(GROUP, "pickFolder"),
    importPath: () => dispatch<CopyOpsPickResponse>(GROUP, "importPath"),
    exportPath: (defaultFilename = "copy.json") =>
        dispatch<CopyOpsPickResponse>(GROUP, "exportPath", { defaultFilename }),
    readTextFile: (path: string) => dispatch<{ content: string; }>(GROUP, "readTextFile", { path }),
    writeTextFile: (path: string, content: string) =>
        dispatch<CopyOpsSaveResponse>(GROUP, "writeTextFile", { path, content }),
    /** Resolve .lnk targets and normalize file→parent for folder fields. */
    normalizeDropPath: (path: string, kind: NormalizeDropPathKind) =>
        dispatch<NormalizeDropPathResponse>(GROUP, "normalizeDropPath", { path, kind }),
    copyBatch: (req: CopyBatchRequest) => dispatch<CopyBatchResponse>(GROUP, "copyBatch", req),
};
