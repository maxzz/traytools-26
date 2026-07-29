import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { classNames } from "@/utils/classnames";
import { toUnix } from "@/utils";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { FolderOpen, FileIcon, SquareArrowOutUpRight } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { appBus, copyOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import { OnFileDrop, OnFileDropOff } from "@/../wailsjs/runtime/runtime";

export function PathInput({
    value,
    onChange,
    kind,
    showReveal,
    acceptUrls,
}: {
    value: string;
    onChange: (path: string) => void;
    kind: PathKind;
    showReveal?: boolean;
    /** When true, accept browser link drops and expand .url Internet Shortcuts to their URL. */
    acceptUrls?: boolean;
}) {

    const [dragOver, setDragOver] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);
    const onChangeRef = useRef<typeof onChange>(onChange);
    const kindRef = useRef<typeof kind>(kind);
    const acceptUrlsRef = useRef(!!acceptUrls);

    onChangeRef.current = onChange;
    kindRef.current = kind;
    acceptUrlsRef.current = !!acceptUrls;

    // Prefer forward slashes for filesystem paths; leave scheme:// URLs alone.
    function setPath(path: string) {
        onChange(isProbablyURL(path) ? path.trim() : toUnix(path));
    }

    useEffect(
        () => {
            const el = dropRef.current;
            if (!el) {
                return;
            }
            return registerFileDropTarget({
                el,
                getKind: () => kindRef.current,
                resolveUrlFile: () => acceptUrlsRef.current,
                onPath: (path) => {
                    onChangeRef.current(isProbablyURL(path) ? path.trim() : toUnix(path));
                },
            });
        },
        []);

    async function browse() {
        try {
            const initial = value.trim();
            const res = kind === "file" ? await copyOpsBus.pickFile(initial || undefined) : await copyOpsBus.pickFolder(initial || undefined);
            if (!res.canceled && res.path) {
                await applyDroppedPath(res.path, kind, setPath, { resolveUrlFile: acceptUrls });
            }
        } catch (e) {
            console.error("Path browse failed", e);
        }
    }

    const trimmed = value.trim();
    const canReveal = trimmed.length > 0 && !isProbablyURL(trimmed);

    function reveal() {
        if (!canReveal) {
            return;
        }
        // Files: select/highlight in the parent. Folders: open the folder itself.
        const open = kind === "folder" ? appBus.openInExplorer(trimmed) : appBus.revealInExplorer(trimmed);
        void open.catch((e) => {
            notice.error(`Failed to ${kind === "folder" ? "open" : "reveal"} in File Explorer:<br/>${String(e)}`);
        });
    }

    function dragHasAcceptablePayload(dt: DataTransfer): boolean {
        if (dt.types.includes("Files")) {
            return true;
        }
        if (!acceptUrls) {
            return false;
        }
        return dt.types.includes("text/uri-list")
            || dt.types.includes("text/plain")
            || dt.types.includes("URL");
    }

    // Visual feedback + optional Chromium File.path. Never stopPropagation.
    function onDragOver(e: DragEvent) {
        if (!dragHasAcceptablePayload(e.dataTransfer)) {
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
    }

    function onDragLeave(e: DragEvent) {
        const related = e.relatedTarget as Node | null;
        if (related && dropRef.current?.contains(related)) {
            return;
        }
        setDragOver(false);
    }

    function onDrop(e: DragEvent) {
        setDragOver(false);
        if (acceptUrls) {
            const uri = uriFromDataTransfer(e.dataTransfer);
            if (uri) {
                e.preventDefault();
                setPath(uri);
                return;
            }
        }
        const path = pathFromDataTransfer(e.dataTransfer);
        if (path) {
            void applyDroppedPath(path, kind, setPath, { resolveUrlFile: acceptUrls });
        }
        // Let the event bubble to Wails' window listener for WebView2 path resolution.
    }

    const Icon = kind === "file" ? FileIcon : FolderOpen;

    return (
        <InputGroup
            className={classNames(dragOver && "ring-1 ring-sky-500")}
            ref={dropRef}
            style={DROP_TARGET_STYLE}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <InputGroupInput
                style={DROP_TARGET_STYLE}
                value={value}
                onChange={(e) => setPath(e.target.value)}
                {...turnOffAutoComplete}
            />

            <InputGroupAddon className="p-0 pr-1.5 gap-0.5" align="inline-end">
                <InputGroupButton
                    className="-mr-1"
                    size="icon-xs"
                    title={`Select ${kind}`}
                    onClick={browse}
                    tabIndex={-1}
                >
                    <Icon className="size-3.5 stroke-[1.5px]" />
                </InputGroupButton>

                {showReveal && (
                    <InputGroupButton
                        size="icon-xs"
                        title={
                            !trimmed
                                ? "Enter a path first"
                                : isProbablyURL(trimmed)
                                    ? "Reveal is not available for URLs"
                                    : kind === "file"
                                        ? "Reveal in File Explorer"
                                        : "Open folder in File Explorer"
                        }
                        aria-label={kind === "file" ? "Reveal in File Explorer" : "Open folder in File Explorer"}
                        disabled={!canReveal}
                        onClick={reveal}
                        tabIndex={-1}
                    >
                        <SquareArrowOutUpRight className="size-3.5 stroke-[1.5px]" />
                    </InputGroupButton>
                )}
            </InputGroupAddon>
        </InputGroup>
    );
}

/** Call once when a page with PathInput mounts so the drop listener is ready early. */
export function initPathDropListener() {
    // Do not read window.wails.flags.enableWailsDragAndDrop here: the Wails JS
    // runtime defaults it to false, and Go flips it to true only after
    // navigationCompleted (ExecJS). That races with React mount / Vite HMR and
    // produces a false warning even when main.go has EnableFileDrop: true.
    ensureDropListener();
}

// --------------------------------------------------------------------------
// Drag-and-drop support

type PathKind = "file" | "folder";

/** Marker used by Wails drag-over styling. Value must match CSSDropValue ("drop"). */
export const DROP_TARGET_STYLE: CSSProperties = { ["--wails-drop-target"]: "drop" };

export type FileDropTarget = {
    el: HTMLElement;
    /** PathInput: single path + field kind. */
    getKind?: () => PathKind;
    /** When true, expand dropped .url files to their Internet Shortcut URL. */
    resolveUrlFile?: () => boolean;
    onPath?: (path: string) => void;
    /** Multi-file consumers (e.g. copy-ops tree). When set, receives all normalized paths. */
    onPaths?: (paths: string[], x: number, y: number) => void;
    /** Kind used when normalizing for `onPaths` (default "file"). */
    pathsKind?: PathKind;
};

type FileWithPath = File & { path?: string; };

const dropTargets = new Set<FileDropTarget>();
let dropListening = false;

export function isProbablyURL(s: string): boolean {
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(s.trim());
}

function findTargetAt(x: number, y: number): FileDropTarget | null {
    const under = document.elementFromPoint(x, y);
    const containing: FileDropTarget[] = [];
    if (under) {
        for (const target of dropTargets) {
            if (target.el === under || target.el.contains(under)) {
                containing.push(target);
            }
        }
    }
    if (containing.length > 0) {
        // Prefer the deepest / most specific registered target.
        return containing.reduce((best, t) => {
            if (best.el.contains(t.el)) {
                return t;
            }
            if (t.el.contains(best.el)) {
                return best;
            }
            return best;
        });
    }
    for (const target of dropTargets) {
        const rect = target.el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            return target;
        }
    }
    return null;
}

/** Resolve .lnk / optional .url targets and, for folder fields, strip a trailing filename. */
async function applyDroppedPath(
    rawPath: string,
    kind: PathKind,
    onPath: (path: string) => void,
    opts?: { resolveUrlFile?: boolean; },
) {
    try {
        const res = await copyOpsBus.normalizeDropPath(rawPath, kind, {
            resolveUrlFile: opts?.resolveUrlFile,
        });
        if (res?.path) {
            onPath(isProbablyURL(res.path) ? res.path.trim() : toUnix(res.path));
        }
    } catch (e) {
        console.error("normalizeDropPath failed", e);
        // Fall back to raw path so the drop is not silently lost.
        onPath(isProbablyURL(rawPath) ? rawPath.trim() : toUnix(rawPath));
    }
}

/** Normalize many dropped paths; skips entries that fail without a usable fallback. */
export async function normalizeDroppedPaths(rawPaths: string[], kind: PathKind = "file"): Promise<string[]> {
    const out: string[] = [];
    for (const rawPath of rawPaths) {
        const trimmed = rawPath.trim();
        if (!trimmed) {
            continue;
        }
        try {
            const res = await copyOpsBus.normalizeDropPath(trimmed, kind);
            if (res?.path) {
                out.push(toUnix(res.path));
            }
        } catch (e) {
            console.error("normalizeDropPath failed", e);
            // Folders fail kind "file"; keep raw path so the drop is not silently lost.
            out.push(toUnix(trimmed));
        }
    }
    return out;
}

/**
 * Register Wails file-drop once for the app lifetime.
 *
 * Important:
 * - Do NOT call stopPropagation on field drag/drop handlers. Wails listens on
 *   `window` and must see the bubbled drop to ResolveFilePaths → wails:file-drop.
 * - useDropTarget=false so the callback always runs; we hit-test the field ourselves.
 * - Do not OnFileDropOff on field unmount (breaks HMR / remounts).
 */
function ensureDropListener() {
    if (dropListening) {
        return;
    }
    dropListening = true;

    try {
        OnFileDropOff();
    } catch {
        // ignore — first run has nothing to clear
    }

    OnFileDrop((x, y, paths) => {
        if (!paths?.length) {
            return;
        }
        const target = findTargetAt(x, y);
        if (!target) {
            return;
        }
        if (target.onPaths) {
            void normalizeDroppedPaths(paths, target.pathsKind ?? "file").then((normalized) => {
                if (normalized.length) {
                    target.onPaths!(normalized, x, y);
                }
            });
            return;
        }
        if (target.onPath && target.getKind) {
            void applyDroppedPath(paths[0], target.getKind(), target.onPath, {
                resolveUrlFile: target.resolveUrlFile?.(),
            });
        }
    }, false);
}

/** Register a DOM element to receive OS / Wails file drops. */
export function registerFileDropTarget(target: FileDropTarget) {
    ensureDropListener();
    dropTargets.add(target);
    return () => {
        dropTargets.delete(target);
    };
}

export function isFileDrag(dt: DataTransfer | null | undefined): boolean {
    return !!dt?.types && [...dt.types].includes("Files");
}

/** First http(s) / scheme:// URI from a browser link drag, if any. */
export function uriFromDataTransfer(dt: DataTransfer): string | null {
    const uriList = dt.getData("text/uri-list");
    if (uriList) {
        for (const line of uriList.split(/\r?\n/)) {
            const t = line.trim();
            if (!t || t.startsWith("#")) {
                continue;
            }
            // Skip local file:// — those are handled as filesystem paths.
            if (/^file:/i.test(t)) {
                continue;
            }
            if (isProbablyURL(t)) {
                return t;
            }
        }
    }
    for (const type of ["text/plain", "URL", "text/x-moz-url"] as const) {
        const raw = dt.getData(type)?.trim();
        if (!raw) {
            continue;
        }
        // text/x-moz-url is "url\ntitle"
        const first = raw.split(/\r?\n/)[0]?.trim() ?? "";
        if (first && !/^file:/i.test(first) && isProbablyURL(first)) {
            return first;
        }
    }
    return null;
}

export function pathsFromDataTransfer(dt: DataTransfer): string[] {
    const fromFiles: string[] = [];
    const files = dt.files;
    if (files?.length) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i] as FileWithPath;
            if (typeof file.path === "string" && file.path.length > 0) {
                fromFiles.push(toUnix(file.path));
            }
        }
    }
    if (fromFiles.length) {
        return fromFiles;
    }
    const text = dt.getData("text/plain")?.trim();
    if (text && (/^[a-zA-Z]:[\\/]/.test(text) || text.startsWith("\\\\") || text.startsWith("file:"))) {
        // Prefer forward slashes for UI / JSON; Windows accepts both at launch.
        return [toUnix(text.replace(/^file:\/\/\/?/i, ""))];
    }
    return [];
}

function pathFromDataTransfer(dt: DataTransfer): string | null {
    return pathsFromDataTransfer(dt)[0] ?? null;
}
