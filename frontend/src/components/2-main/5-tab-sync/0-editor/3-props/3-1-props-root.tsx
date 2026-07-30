import { type ReactNode } from "react";
import { classNames } from "@/utils/classnames";
import { FileIcon, Folder } from "lucide-react";

export function PropsFor_Root() {
    return (
        <p className="text-muted-foreground">
            Root of the sync operations tree. Add groups here. Groups can contain sync items
            (folder pairs) and nested groups in one ordered list. Groups and items can be
            reordered by drag-and-drop. This node cannot be moved or deleted.
        </p>
    );
}

export function LabelAndField({ label, children }: { label: string; children: ReactNode; }) {
    // Keep Label and Input as siblings — Label's select-none must not wrap the input
    // or caret placement breaks when typing at the start of the value.
    return (
        <label className="text-xs font-normal whitespace-nowrap flex flex-col items-start gap-0.5">
            <div className="text-[0.65rem] text-muted-foreground whitespace-nowrap">
                {label}
            </div>
            {children}
        </label>
    );
}

const typeIconLabelClasses = "text-[0.65rem] font-normal text-foreground/70 select-none";

export function Field_TypeIcon({ kind }: { kind: "group" | "item"; }) {
    const isGroup = kind === "group";
    const iconClass = classNames(
        "shrink-0 size-3.5",
        isGroup
            ? "text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900"
            : "text-foreground/70",
    );

    return (
        <div className={classNames(typeIconLabelClasses, "px-2 py-1 w-fit bg-muted border rounded inline-flex items-center gap-1")}>
            {isGroup
                ? <Folder className={iconClass} />
                : <FileIcon className={iconClass} />
            }
            {isGroup ? "Group" : "Sync item"}
        </div>
    );
}
