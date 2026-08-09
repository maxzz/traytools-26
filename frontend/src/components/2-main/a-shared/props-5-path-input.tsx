import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { classNames } from "@/utils/classnames";
import { toUnix } from "@/utils";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { FolderOpen, FileIcon, SquareArrowOutUpRight } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { appBus, copyOpsBus } from "@/bridge";
import { notice } from "@/ui/local-ui/7-toaster";
import { OnFileDrop, OnFileDropOff } from "@/../wailsjs/runtime/runtime";
import { extractURLFromInternetShortcutFile } from "./url-shortcut";

export type PathPickResult = { canceled: boolean; path?: string; };

export function PathInput({
    value,
    onChange,
    kind,
    showReveal,
    acceptUrls,
    pickPath,
}: {
    value: string;
    onChange: (path: string) => void;
    kind: PathKind;
    showReveal?: boolean;
    /** When true, accept browser link drops and expand .url Internet Shortcuts to their URL. */
    acceptUrls?: boolean;
    /** Optional browse dialog; defaults to copyOpsBus pickFile/pickFolder. */
    pickPath?: (initialPath?: string) => Promise<PathPickResult>;
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
            const res = pickPath
                ? await pickPath(initial || undefined)
                : kind === "file"
                    ? await copyOpsBus.pickFile(initial || undefined)
                    : await copyOpsBus.pickFolder(initial || undefined);
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
        // WebView2 / Edge expose link drags under several type names.
        return [...dt.types].some((t) =>
            /uri-list|text\/plain|^text$|^URL$|moz-url|html/i.test(t)
        );
    }

    // Visual feedback + optional Chromium File.path. Never stopPropagation for
    // normal filesystem drops (Wails window listener must see them). URI / .url
    // handling below may stopPropagation after a successful acceptUrls consume.
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
                // Address-bar / link drag: consume here. Wails ResolveFilePaths
                // often yields an empty path for these and would error otherwise.
                e.preventDefault();
                e.stopPropagation();
                markUrlDropHandled();
                setPath(uri);
                return;
            }

            const urlFile = findUrlFile(e.dataTransfer);
            if (urlFile) {
                e.preventDefault();
                e.stopPropagation();
                markUrlDropHandled();
                const filePath = (urlFile as FileWithPath).path;
                void (async () => {
                    // Prefer reading the shortcut body from the File blob — works
                    // even when WebView2 does not expose File.path / Wails path.
                    const fromBlob = await extractURLFromInternetShortcutFile(urlFile);
                    if (fromBlob) {
                        setPath(fromBlob);
                        return;
                    }
                    if (filePath?.trim()) {
                        await applyDroppedPath(filePath, kind, setPath, { resolveUrlFile: true });
                    }
                })();
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
                        // Use aria-disabled (not disabled): InputGroup's has-disabled:opacity-50
                        // would dim the whole field — including a filled URL value.
                        className={!canReveal ? "opacity-50" : undefined}
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
                        aria-disabled={!canReveal}
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

/** Suppress a trailing Wails OnFileDrop after we already handled a URI/.url drop. */
let urlDropHandledUntil = 0;

function markUrlDropHandled() {
    urlDropHandledUntil = performance.now() + 750;
}

function wasUrlDropJustHandled() {
    return performance.now() < urlDropHandledUntil;
}

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
    const trimmed = rawPath?.trim() ?? "";
    if (!trimmed) {
        return;
    }
    try {
        const res = await copyOpsBus.normalizeDropPath(trimmed, kind, {
            resolveUrlFile: opts?.resolveUrlFile,
        });
        if (res?.path) {
            onPath(isProbablyURL(res.path) ? res.path.trim() : toUnix(res.path));
        }
    } catch (e) {
        console.error("normalizeDropPath failed", e);
        // Fall back to raw path so the drop is not silently lost.
        onPath(isProbablyURL(trimmed) ? trimmed : toUnix(trimmed));
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
 * - Do NOT call stopPropagation on field drag/drop handlers for normal files.
 *   Wails listens on `window` and must see the bubbled drop to ResolveFilePaths.
 * - URI / .url drops with acceptUrls may stopPropagation after handling.
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
        if (wasUrlDropJustHandled()) {
            return;
        }
        // Browser link drops often arrive as [""] from ResolveFilePaths — ignore.
        const usable = (paths ?? []).map((p) => p?.trim() ?? "").filter(Boolean);
        if (!usable.length) {
            return;
        }
        const target = findTargetAt(x, y);
        if (!target) {
            return;
        }
        if (target.onPaths) {
            void normalizeDroppedPaths(usable, target.pathsKind ?? "file").then((normalized) => {
                if (normalized.length) {
                    target.onPaths!(normalized, x, y);
                }
            });
            return;
        }
        if (target.onPath && target.getKind) {
            void applyDroppedPath(usable[0], target.getKind(), target.onPath, {
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

function findUrlFile(dt: DataTransfer): File | null {
    const files = dt.files;
    if (!files?.length) {
        return null;
    }
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f && /\.url$/i.test(f.name)) {
            return f;
        }
    }
    return null;
}

/**
 * First http(s) / scheme:// URI from a browser link / address-bar drag.
 * WebView2 may expose the URL under several MIME type names; scan them all.
 */
export function uriFromDataTransfer(dt: DataTransfer): string | null {
    const tryText = (raw: string | undefined | null): string | null => {
        if (!raw?.trim()) {
            return null;
        }
        for (const line of raw.split(/\r?\n/)) {
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
            // text/html: <a href="https://...">
            const href = t.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]?.trim();
            if (href && !/^file:/i.test(href) && isProbablyURL(href)) {
                return href;
            }
        }
        return null;
    };

    // Preferred types first, then every type the browser advertised.
    const preferred = [
        "text/uri-list",
        "text/x-moz-url",
        "URL",
        "UniformResourceLocator",
        "UniformResourceLocatorW",
        "text/plain",
        "text",
        "text/html",
    ];
    const seen = new Set<string>();
    for (const type of [...preferred, ...dt.types]) {
        if (!type || seen.has(type)) {
            continue;
        }
        seen.add(type);
        let raw = "";
        try {
            raw = dt.getData(type);
        } catch {
            continue;
        }
        const found = tryText(raw);
        if (found) {
            return found;
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

