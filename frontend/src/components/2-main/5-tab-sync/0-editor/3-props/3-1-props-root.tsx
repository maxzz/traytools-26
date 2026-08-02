import { type ReactNode } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { FileIcon, Folder } from "lucide-react";
import { type SyncGroup } from "../../a-atoms/9-types-sync";
import { syncEditorStore } from "../../a-atoms/0-sync-local-storage";
import { QuickAccessList } from "./3-4-quick-list";

export function PropsFor_Root() {
    const { config } = useSnapshot(syncEditorStore, { sync: true });
    const groups = config.groups as SyncGroup[];

    return (<>
        <p className="text-muted-foreground">
            Root of the sync operations tree. Add groups here. Groups can contain sync items
            (folder pairs), nested groups, and separators in one ordered list. Groups and items
            can be reordered by drag-and-drop. This node cannot be moved or deleted.
        </p>

        <QuickAccessList nodes={groups} />
    </>);
}

export function PropsFor_Separator() {
    return (<>
        <Field_TypeIcon kind="separator" />

        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the tree and in the quick actions list.
        </p>
    </>);
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

export function Field_TypeIcon({ kind }: { kind: "group" | "item" | "separator"; }) {
    const label = kind === "group" ? "Group" : kind === "separator" ? "Separator" : "Sync item";

    return (
        <div className={classNames(typeIconLabelClasses, "px-2 py-1 w-fit bg-muted border rounded inline-flex items-center gap-1")}>
            {kind === "group"
                ? <Folder className="shrink-0 size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                : kind === "item"
                    ? <FileIcon className="shrink-0 size-3.5 text-foreground/70" />
                    : null
            }
            {label}
        </div>
    );
}
