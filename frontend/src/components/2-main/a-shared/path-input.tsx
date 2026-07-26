import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { classNames } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { FolderOpen, FileIcon, SquareArrowOutUpRight } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { appBus, copyOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import { OnFileDrop, OnFileDropOff } from "@/../wailsjs/runtime/runtime";

export function PathInput({ value, onChange, kind, showReveal, }: { value: string; onChange: (path: string) => void; kind: PathKind; showReveal?: boolean; }) {

    const [dragOver, setDragOver] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);
    const onChangeRef = useRef<typeof onChange>(onChange);
    const kindRef = useRef<typeof kind>(kind);

    onChangeRef.current = onChange;
    kindRef.current = kind;

    useEffect(
        () => {
            const el = dropRef.current;
            if (!el) {
                return;
            }
            return registerFileDropTarget({
                el,
                getKind: () => kindRef.current,
                onPath: (path) => onChangeRef.current(path),
            });
        },
        []);

    async function browse() {
        try {
            const initial = value.trim();
            const res = kind === "file" ? await copyOpsBus.pickFile(initial || undefined) : await copyOpsBus.pickFolder(initial || undefined);
            if (!res.canceled && res.path) {
                onChange(res.path);
            }
        } catch (e) {
            console.error("Path browse failed", e);
        }
    }

    const trimmed = value.trim();
    const canReveal = trimmed.length > 0;

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

    // Visual feedback + optional Chromium File.path. Never stopPropagation.
    function onDragOver(e: DragEvent) {
        if (!e.dataTransfer.types.includes("Files")) {
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
        const path = pathFromDataTransfer(e.dataTransfer);
        if (path) {
            void applyDroppedPath(path, kind, onChange);
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
                onChange={(e) => onChange(e.target.value)}
                {...turnOffAutoComplete}
            />

            <InputGroupAddon className="p-0 gap-0.5 pr-1.5" align="inline-end">
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
                        title={!canReveal ? "Enter a path first" : kind === "file" ? "Reveal in File Explorer" : "Open folder in File Explorer"}
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
    onPath?: (path: string) => void;
    /** Multi-file consumers (e.g. copy-ops tree). When set, receives all normalized paths. */
    onPaths?: (paths: string[], x: number, y: number) => void;
    /** Kind used when normalizing for `onPaths` (default "file"). */
    pathsKind?: PathKind;
};

type FileWithPath = File & { path?: string; };

const dropTargets = new Set<FileDropTarget>();
let dropListening = false;

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

/** Resolve .lnk targets and, for folder fields, strip a trailing filename. */
async function applyDroppedPath(rawPath: string, kind: PathKind, onPath: (path: string) => void) {
    try {
        const res = await copyOpsBus.normalizeDropPath(rawPath, kind);
        if (res?.path) {
            onPath(res.path);
        }
    } catch (e) {
        console.error("normalizeDropPath failed", e);
        // Fall back to raw path so the drop is not silently lost.
        onPath(rawPath);
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
                out.push(res.path);
            }
        } catch (e) {
            console.error("normalizeDropPath failed", e);
            // Folders fail kind "file"; keep raw path so the drop is not silently lost.
            out.push(trimmed);
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
            void applyDroppedPath(paths[0], target.getKind(), target.onPath);
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

export function pathsFromDataTransfer(dt: DataTransfer): string[] {
    const fromFiles: string[] = [];
    const files = dt.files;
    if (files?.length) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i] as FileWithPath;
            if (typeof file.path === "string" && file.path.length > 0) {
                fromFiles.push(file.path);
            }
        }
    }
    if (fromFiles.length) {
        return fromFiles;
    }
    const text = dt.getData("text/plain")?.trim();
    if (text && (/^[a-zA-Z]:[\\/]/.test(text) || text.startsWith("\\\\") || text.startsWith("file:"))) {
        return [text.replace(/^file:\/\/\/?/i, "").replace(/\//g, "\\")];
    }
    return [];
}

function pathFromDataTransfer(dt: DataTransfer): string | null {
    return pathsFromDataTransfer(dt)[0] ?? null;
}
