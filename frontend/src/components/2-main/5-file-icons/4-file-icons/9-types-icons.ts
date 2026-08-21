export type FileIconStatus = "idle" | "loading" | "ready" | "missing";

export type FileIconEntry = {
    status: FileIconStatus;
    dataUrl: string; // data:image/png;base64,... when ready
};
