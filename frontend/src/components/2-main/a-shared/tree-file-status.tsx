import { type ComponentProps } from "react";
import { classNames } from "@/utils/classnames";
import { AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";

// ---------------------------------------------------------------------------
// Working-file caption (root row label + info tooltip)
// ---------------------------------------------------------------------------

export type WorkingFileCaption = {
    label: string;
    detail: string;
    aria: string;
};

/** Basename of a path for tree/toolbar captions (handles / and \\). */
export function pathBaseName(path: string): string {
    const src = path.trim();
    if (!src) {
        return "";
    }
    const parts = src.replace(/\//g, "\\").split("\\");
    return parts[parts.length - 1] || src;
}

/**
 * Caption for the tree root file label / info tooltip.
 * Supports the usual editor sources: default, file, storage, import, open.
 */
export function workingFileCaption(snap: { path: string; source: string; fileExists: boolean; }): WorkingFileCaption {
    const { path, source, fileExists } = snap;

    if (source === "import" && path) {
        return {
            label: pathBaseName(path),
            detail: path,
            aria: `Imported file: ${path}`,
        };
    }

    if (fileExists && path) {
        return {
            label: pathBaseName(path),
            detail: path,
            aria: source === "open" ? `Opened file: ${path}` : `Working file: ${path}`,
        };
    }

    if (source === "default") {
        const detail = "New configuration — stored in local storage until you Save.";
        return {
            label: "New (local storage)",
            detail,
            aria: detail,
        };
    }

    const detail = path
        ? `No file on disk yet (expected ${path}). Stored in local storage until you Save.`
        : "Stored in local storage until you Save.";
    return {
        label: "Local storage",
        detail,
        aria: detail,
    };
}

// ---------------------------------------------------------------------------
// Root-row chrome
// ---------------------------------------------------------------------------

/** Info / error icon that shows the working-file path (and error) in a tooltip. */
export function RootFileInfoButton({ working, error }: { working: WorkingFileCaption; error: string; }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className={classNames(
                            "shrink-0 size-3.5 border rounded-full inline-flex items-center justify-center",
                            error
                                ? "text-destructive border-destructive/70 bg-destructive/15"
                                : "text-muted-foreground border-border bg-muted",
                        )}
                        aria-label={working.aria}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {error
                            ? <AlertTriangle className="size-2" />
                            : <Info className="size-2" />
                        }
                    </button>
                </TooltipTrigger>

                <TooltipContent side="bottom" className="max-w-80">
                    <div className="flex flex-col gap-1">
                        {error && <p>{error}</p>}
                        <p>{working.detail}</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/** Clickable “modified” badge on the tree root; typically wired to Save. */
export function ModifiedBadge({ onSave }: { onSave: () => void | Promise<void>; }) {
    return (
        <button
            type="button"
            className="shrink-0 px-1 py-px text-[0.55rem] leading-none font-normal 
            text-orange-50 
            bg-red-500 
            dark:text-orange-50 
            dark:border-red-400 
            hover:bg-red-600/50 
            dark:hover:bg-red-400/45 
            border-red-600 
            border 
            rounded 
            cursor-pointer"
            title="Save changes"
            aria-label="Save changes"
            onClick={(e) => {
                e.stopPropagation();
                void onSave();
            }}
        >
            modified
        </button>
    );
}

/** Small red circle after a tree row name when that node differs from baseline. */
export function DirtyDot({ className, ...rest }: ComponentProps<"span">) {
    return (
        <span
            className={classNames("shrink-0 size-1.5 rounded-full bg-red-500", className)}
            title="Modified"
            aria-label="Modified"
            {...rest}
        />
    );
}

/** Same focus/unfocus selection look as the Windows tab (kibo-ui-tree). */
export const treeRowSelectedClasses = classNames(
    "text-tree-select-foreground bg-tree-select",
    "group-focus-within/tree:bg-tree-select-focused group-focus-within/tree:text-tree-select-focused-foreground",
    "group-focus-within/tree:ring-1 group-focus-within/tree:ring-inset group-focus-within/tree:ring-tree-select-border",
    "group-focus-within/tree:font-medium",
);
