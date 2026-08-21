import { dispatch } from "../dispatch";

const GROUP = "fileicon";

export interface FileIconResult {
    path: string;
    dataUrl: string;
    error?: string;
}

/**
 * File-icon command group. Mirrors the "fileicon" group on the backend bus:
 * getFileIcons extracts PNG data URLs from executable / .ico paths.
 */
export const fileIconBus = {
    getFileIcons: (paths: string[]) => dispatch<FileIconResult[]>(GROUP, "getFileIcons", { paths }),
};
