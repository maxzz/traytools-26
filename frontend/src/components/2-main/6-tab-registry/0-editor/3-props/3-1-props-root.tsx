import { type ReactNode } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { Folder } from "lucide-react";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Label } from "@/ui/shadcn/label";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Button } from "@/ui/shadcn/button";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/field-comment";
import { type RegGroup, type RegSeparator, collectGroupItems } from "../../a-atoms/9-types-registry";
import { patchSelectedSeparator } from "../../a-atoms/use-selected-node";
import { registryEditorStore } from "../../a-atoms/0-registry-local-storage";
import { confirmRegistryWritesAtom, doAsyncRegReadAllAtom } from "../../a-atoms/2-run-registry";
import { QuickAccessList } from "./3-4-quick-list";

export function PropsFor_Root() {
    const { config } = useSnapshot(registryEditorStore, { sync: true });
    const groups = config.groups as RegGroup[];
    const readAll = useSetAtom(doAsyncRegReadAllAtom);
    const hasItems = groups.some((group) => collectGroupItems(group).length > 0);

    return (<>
        <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground">
                Root of the registry operations tree. Add groups here, or drop a .reg or .json file onto the tree
                to import one as a new group. Groups and values can be reordered by drag-and-drop.
                This node cannot be moved or deleted.
            </p>
        </div>

        <Field_Comment
            value={config.comment ?? ""}
            onChange={(next) => applyComment(registryEditorStore.config, next)}
        />

        <div className="flex items-center gap-2">
            <RegActionButton label="Read all current values" disabled={!hasItems} onClick={() => void readAll()} />
            <ConfirmWritesToggle />
        </div>

        <QuickAccessList nodes={groups} />
    </>);
}

export function PropsFor_Separator({ separator }: { separator: RegSeparator; }) {
    return (<>
        <Field_TypeIcon kind="separator" />

        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the tree and in the quick actions list.
        </p>

        <Field_Comment
            value={separator.comment ?? ""}
            onChange={(next) => patchSelectedSeparator((s) => applyComment(s, next))}
        />
    </>);
}

// ---------------------------------------------------------------------------
// Shared UI

function ConfirmWritesToggle() {
    const [confirm, setConfirm] = useAtom(confirmRegistryWritesAtom);

    return (
        <FlagSwitch
            label="Confirm before writing"
            hint="Show a confirmation dialog before any registry write. Registry edits cannot be undone from here."
            checked={confirm}
            onCheckedChange={setConfirm}
        />
    );
}

export function RegActionButton({ label, disabled, title, onClick }: { label: string; disabled: boolean; title?: string; onClick: () => void; }) {
    return (
        <Button
            className="font-normal text-sky-800 bg-sky-200 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80 border-sky-500/60"
            variant="secondary"
            size="xs"
            disabled={disabled}
            title={title}
            onClick={onClick}
            type="button"
        >
            {label}
        </Button>
    );
}

export function FlagSwitch({ label, hint, checked, disabled, onCheckedChange, }: { label: string; hint: string; checked: boolean; disabled?: boolean; onCheckedChange: (v: boolean) => void; }) {
    return (
        <Label
            className={classNames(
                "font-normal text-[0.65rem] text-muted-foreground flex items-center gap-1",
                disabled ? "opacity-70 cursor-default" : "cursor-pointer",
            )}
            title={hint}
        >
            <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onCheckedChange(v === true)} />
            <span className="mt-0.5">{label}</span>
        </Label>
    );
}

export function LabelAndField({ label, labelHint, children }: { label: string; labelHint?: string; children: ReactNode; }) {
    // Keep Label and Input as siblings — Label's select-none must not wrap the input
    // or caret placement breaks when typing at the start of the value.
    return (
        <Label className="text-xs font-normal whitespace-nowrap flex flex-col items-start gap-0.5">
            <div className="text-[0.65rem] text-muted-foreground whitespace-nowrap" title={labelHint}>
                {label}
            </div>
            {children}
        </Label>
    );
}

const typeIconLabelClasses = "text-[0.65rem] font-normal text-foreground/70 select-none";

export function Field_TypeIcon({ kind }: { kind: "group" | "item" | "separator"; }) {
    const label = kind === "group" ? "Group" : kind === "separator" ? "Separator" : "Registry value";

    return (
        <div className={classNames(typeIconLabelClasses, "px-2 py-1 w-fit bg-muted border rounded inline-flex items-center gap-1")}>
            {kind === "group"
                ? <Folder className="shrink-0 size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                : kind === "item"
                    ? <SymbolAppRegedit className="shrink-0 size-3.5 opacity-70" />
                    : null
            }
            {label}
        </div>
    );
}
