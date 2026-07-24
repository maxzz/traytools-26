import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { FolderOpen, FileIcon } from "lucide-react";
import { Input } from "@/ui/shadcn/input";
import { Button } from "@/ui/shadcn/button";
import { appBus, copyOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import { OnFileDrop, OnFileDropOff } from "@/../wailsjs/runtime/runtime";

type PathKind = "file" | "folder";

/** Marker used by Wails drag-over styling. Value must match CSSDropValue ("drop"). */
const DROP_TARGET_STYLE = {
    ["--wails-drop-target" as string]: "drop",
} as CSSProperties;

type DropTarget = {
    el: HTMLElement;
    getKind: () => PathKind;
    onPath: (path: string) => void;
};

type FileWithPath = File & { path?: string; };

const dropTargets = new Set<DropTarget>();
let dropListening = false;

function findTargetAt(x: number, y: number): DropTarget | null {
    const under = document.elementFromPoint(x, y);
    if (under) {
        for (const target of dropTargets) {
            if (target.el === under || target.el.contains(under)) {
                return target;
            }
        }
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
        void applyDroppedPath(paths[0], target.getKind(), target.onPath);
    }, false);
}

function registerDropTarget(target: DropTarget) {
    ensureDropListener();
    dropTargets.add(target);
    return () => {
        dropTargets.delete(target);
    };
}

function pathFromDataTransfer(dt: DataTransfer): string | null {
    const file = dt.files?.[0] as FileWithPath | undefined;
    if (file && typeof file.path === "string" && file.path.length > 0) {
        return file.path;
    }
    const text = dt.getData("text/plain")?.trim();
    if (text && (/^[a-zA-Z]:[\\/]/.test(text) || text.startsWith("\\\\") || text.startsWith("file:"))) {
        return text.replace(/^file:\/\/\/?/i, "").replace(/\//g, "\\");
    }
    return null;
}

export function PathInput({
    kind,
    value,
    onChange,
    label,
    showReveal = false,
}: {
    kind: PathKind;
    value: string;
    onChange: (path: string) => void;
    label: string;
    /** Show a "Reveal in File Explorer" button (disabled when the path is empty). */
    showReveal?: boolean;
}) {
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
            return registerDropTarget({
                el,
                getKind: () => kindRef.current,
                onPath: (path) => onChangeRef.current(path),
            });
        },
        []);

    const browse = async () => {
        try {
            const res = kind === "file" ? await copyOpsBus.pickFile() : await copyOpsBus.pickFolder();
            if (!res.canceled && res.path) {
                onChange(res.path);
            }
        } catch (e) {
            console.error("Path browse failed", e);
        }
    };

    const trimmed = value.trim();
    const canReveal = trimmed.length > 0;

    const reveal = () => {
        if (!canReveal) {
            return;
        }
        void appBus.revealInExplorer(trimmed).catch((e) => {
            notice.error(`Failed to reveal in File Explorer:<br/>${String(e)}`);
        });
    };

    // Visual feedback + optional Chromium File.path. Never stopPropagation.
    const onDragOver = (e: DragEvent) => {
        if (!e.dataTransfer.types.includes("Files")) {
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
    };

    const onDragLeave = (e: DragEvent) => {
        const related = e.relatedTarget as Node | null;
        if (related && dropRef.current?.contains(related)) {
            return;
        }
        setDragOver(false);
    };

    const onDrop = (e: DragEvent) => {
        setDragOver(false);
        const path = pathFromDataTransfer(e.dataTransfer);
        if (path) {
            void applyDroppedPath(path, kind, onChange);
        }
        // Let the event bubble to Wails' window listener for WebView2 path resolution.
    };

    const Icon = kind === "file" ? FileIcon : FolderOpen;

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div
                ref={dropRef}
                style={DROP_TARGET_STYLE}
                className={cn("transition-shadow rounded-md flex items-center gap-1", dragOver && "ring-2 ring-sky-500 ring-offset-1",)}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                <Input
                    className="flex-1 h-7"
                    style={DROP_TARGET_STYLE}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={kind === "file" ? "C:\\path\\to\\file" : "C:\\path\\to\\folder"}
                    {...turnOffAutoComplete}
                />

                <Button type="button" variant="outline" size="icon-xs" title={`Open ${kind} for operation`} onClick={browse} tabIndex={-1}>
                    <Icon className="size-3.5 stroke-[1.5px]" />
                </Button>

                {showReveal && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        title={canReveal ? "Reveal in File Explorer" : "Enter a path first"}
                        aria-label="Reveal in File Explorer"
                        disabled={!canReveal}
                        onClick={reveal}
                        tabIndex={-1}
                    >
                        <FolderOpen className="size-3.5 stroke-[1.5px]" />
                    </Button>
                )}
            </div>
        </div>
    );
}

/** Call once when the Copy Operations page mounts so the listener is ready early. */
export function initCopyPathDropListener() {
    // Do not read window.wails.flags.enableWailsDragAndDrop here: the Wails JS
    // runtime defaults it to false, and Go flips it to true only after
    // navigationCompleted (ExecJS). That races with React mount / Vite HMR and
    // produces a false warning even when main.go has EnableFileDrop: true.
    /*
    const flags = (window as unknown as { wails?: { flags?: { enableWailsDragAndDrop?: boolean; }; }; }).wails?.flags;
    if (flags && !flags.enableWailsDragAndDrop) {
        console.warn(
            "[copy-ops] window.wails.flags.enableWailsDragAndDrop is false. "
            + "Restart the app after a full rebuild so EnableFileDrop takes effect.",
        );
    }
    */
    ensureDropListener();
}
