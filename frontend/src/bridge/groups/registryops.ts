import { dispatch } from "../dispatch";

const GROUP = "registryops";

export type RegHive = "HKCU" | "HKLM" | "HKCR" | "HKU" | "HKCC";

export type RegValueType =
    | "REG_SZ"
    | "REG_EXPAND_SZ"
    | "REG_DWORD"
    | "REG_QWORD"
    | "REG_BINARY"
    | "REG_MULTI_SZ";

/** Registry view to use: native, 32-bit (WOW6432Node), or 64-bit. */
export type RegView = "curr" | "32" | "64";

/** File format for the import / export dialogs. */
export type RegFileKind = "json" | "reg";

export type RegistryRawResponse = {
    found: boolean;
    path: string;
    content?: string;
    error?: string;
};

export type RegistrySaveResponse = {
    path: string;
};

export type RegistryPickResponse = {
    canceled: boolean;
    path?: string;
};

/**
 * One registry value. `value` is always text in the editor's canonical form:
 * literal text for the string types, decimal or 0x-prefixed hex for
 * DWORD/QWORD, comma-separated hex bytes for BINARY, and one line per string
 * for MULTI_SZ.
 */
export type RegValueSpec = {
    hive: RegHive;
    keyPath: string;
    /** Empty string means the key's (Default) value. */
    valueName: string;
    valueType: RegValueType;
    value?: string;
    view?: RegView;
};

export type RegReadResult = {
    index: number;
    /** False when either the key or the value is missing. */
    exists: boolean;
    /** The type actually found, which may differ from the one requested. */
    valueType?: RegValueType;
    value?: string;
    error?: string;
};

export type RegWriteStatus = "written" | "unchanged" | "failed";

export type RegWriteResult = {
    index: number;
    status: RegWriteStatus;
    /** The value this write replaced, when one existed. */
    previousValue?: string;
    error?: string;
    /** Set when the write failed for lack of privileges. */
    accessDenied?: boolean;
};

/**
 * Registry command group. Mirrors the "registryops" group on the backend bus.
 *
 * Batches resolve with their full result arrays rather than streaming events:
 * registry access is fast enough that per-item progress adds no information.
 */
export const registryOpsBus = {
    getRaw: () => dispatch<RegistryRawResponse>(GROUP, "getRaw"),
    save: (content: string) => dispatch<RegistrySaveResponse>(GROUP, "save", { content }),
    importPath: (kind: RegFileKind = "json") =>
        dispatch<RegistryPickResponse>(GROUP, "importPath", { kind }),
    exportPath: (defaultFilename: string, kind: RegFileKind = "json") =>
        dispatch<RegistryPickResponse>(GROUP, "exportPath", { defaultFilename, kind }),
    /** Decodes UTF-16 .reg files to UTF-8 and normalizes line endings. */
    readTextFile: (path: string) => dispatch<{ content: string; }>(GROUP, "readTextFile", { path }),
    /** Re-encodes to UTF-16LE + BOM + CRLF when the path ends in .reg. */
    writeTextFile: (path: string, content: string) =>
        dispatch<RegistrySaveResponse>(GROUP, "writeTextFile", { path, content }),
    readBatch: (items: RegValueSpec[]) =>
        dispatch<{ results: RegReadResult[]; }>(GROUP, "readBatch", { items }),
    writeBatch: (items: RegValueSpec[]) =>
        dispatch<{ results: RegWriteResult[]; }>(GROUP, "writeBatch", { items }),
    /** Open regedit at this key. */
    jump: (hive: RegHive, keyPath: string) => dispatch<void>(GROUP, "jump", { hive, keyPath }),
};
