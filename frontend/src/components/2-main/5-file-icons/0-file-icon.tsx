import { useEffect, type ReactNode } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { type FileIconEntry } from "./4-file-icons/9-types-icons";
import { ensureFileIcons, fileIconStore, normalizeFileIconPath } from "./4-file-icons/c-store-icons";

/**
 * Fixed-size file icon slot. Space is reserved even before the PNG arrives so
 * list rows and property rows do not jump when icons load in the background.
 */
export function FileIcon({ path, className, fallback }: { className?: string; path: string | null | undefined; fallback?: ReactNode; }) {
    const entry = useFileIcon(path);

    return (
        <span className={classNames("shrink-0 size-3.5 inline-flex items-center justify-center", className)} aria-hidden>
            {entry.status === "ready" && entry.dataUrl
                ? (
                    <img
                        src={entry.dataUrl}
                        alt=""
                        draggable={false}
                        className="size-3.5 object-contain"
                    />
                )
                : (fallback ?? <span className="size-3.5" />)
            }
        </span>
    );
}

/**
 * Subscribes to the cached icon for path and kicks off a background fetch if needed.
 */
function useFileIcon(path: string | null | undefined): FileIconEntry {
    const key = normalizeFileIconPath(path);
    const byPath = useSnapshot(fileIconStore.byPath);

    useEffect(
        () => {
            if (!path?.trim()) {
                return;
            }
            ensureFileIcons([path]);
        },
        [path]);

    if (!key) {
        return emptyEntry;
    }

    return (byPath[key] as FileIconEntry | undefined) ?? emptyEntry;
}

const emptyEntry: FileIconEntry = { status: "idle", dataUrl: "" };
