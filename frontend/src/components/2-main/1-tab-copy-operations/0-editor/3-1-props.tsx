import { type ReactNode } from "react";
import { Copy } from "lucide-react";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Button } from "@/ui/shadcn/button";
import { PathInput } from "@/components/2-main/a-shared/path-input";
import { type CopyGroup, type CopyOpItem, collectGroupItems, findByUid, sourceFileBaseName } from "../a-atoms/9-types-copy";
import { patchSelectedGroup, patchSelectedItem } from "../a-atoms/use-selected-node";
import { copyEditorStore } from "../a-atoms/0-copy-local-storage";
import { runCopyGroup, runCopyItem } from "../a-atoms/2-run-copy";

export function PropsFor_Root() {
    return (
        <p className="text-muted-foreground">
            Root of the copy operations tree. Add groups here. Groups can contain copy items and nested groups
            in one ordered list. Groups and items can be reordered by drag-and-drop. This node cannot be moved or deleted.
        </p>
    );
}

export function PropsFor_Group({ group }: { group: CopyGroup; }) {
    const hasItems = collectGroupItems(group).length > 0;
    return (<>
        <div className="-my-2 self-end">
            <CopyActionButton
                label="Copy group"
                disabled={!hasItems}
                onClick={() => copyLiveGroup(group.uid)}
            />
        </div>

        <LabelAndField label="Group name">
            <Input
                className="h-7"
                value={group.name}
                onChange={(e) => patchSelectedGroup((g) => { g.name = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>

        <CopyRunFlags flags={group} onPatch={patchSelectedGroup} />
    </>);
}

export function PropsFor_Item({ item, group }: { item: CopyOpItem; group: CopyGroup; }) {
    const parentHasItems = collectGroupItems(group).length > 0;
    return (<>
        <div className="-my-2 self-end flex items-center gap-2">
            <CopyActionButton
                label="Copy parent group"
                disabled={!parentHasItems}
                title="Copy all items in this item's parent group (including nested groups)"
                onClick={() => copyLiveGroup(group.uid)}
            />
            <CopyActionButton
                label="Copy file"
                disabled={!item.sourceFile.trim() || !item.destFolder.trim()}
                onClick={() => copyLiveItem(item.uid)}
            />
        </div>

        <LabelAndField label="Source file">
            <PathInput
                kind="file"
                value={item.sourceFile}
                onChange={(path) => patchSelectedItem((it) => { it.sourceFile = path; })}
                showReveal
            />
        </LabelAndField>

        <CopyRunFlags flags={item} onPatch={patchSelectedItem} />

        <LabelAndField label="Destination folder">

            <PathInput
                kind="folder"
                value={item.destFolder}
                onChange={(path) => patchSelectedItem((it) => { it.destFolder = path; })}
                showReveal
            />
        </LabelAndField>

        <OperationNameField item={item} />
    </>);
}

// Copy action buttons

function copyLiveGroup(uid?: string) {
    if (!uid) {
        return;
    }
    const loc = findByUid(copyEditorStore.config, uid);
    if (loc?.kind === "group") {
        runCopyGroup(loc.group);
    }
}

function copyLiveItem(uid?: string) {
    if (!uid) {
        return;
    }
    const loc = findByUid(copyEditorStore.config, uid);
    if (loc?.kind === "item") {
        runCopyItem(loc.item);
    }
}

function CopyActionButton({ label, disabled, title, onClick }: { label: string; disabled: boolean; title?: string; onClick: () => void; }) {
    return (
        <Button
            className="font-normal text-sky-800 dark:text-sky-400 bg-sky-200 dark:bg-sky-800/40 border-sky-500/60 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80"
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

// Copy run flags

type CopyRunFlags = Pick<CopyGroup, "stopDpAgent" | "requireElevated" | "renameLocked">;

function CopyRunFlags({ flags, onPatch, }: { flags: CopyRunFlags; onPatch: (fn: (target: CopyRunFlags) => void) => void; }) {
    return (
        <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <FlagSwitch
                label="Stop DpAgent before copy"
                hint="If DpAgent is running, stop it and wait until it is confirmed stopped before copying any items in this group."
                checked={!!flags.stopDpAgent}
                onCheckedChange={(v) => onPatch((t) => { t.stopDpAgent = v; })}
            />

            <FlagSwitch
                label="Require elevated privileges"
                hint="Use when destinations include protected folders such as Program Files."
                checked={!!flags.requireElevated}
                onCheckedChange={(v) => onPatch((t) => { t.requireElevated = v; })}
            />

            <FlagSwitch
                label="Rename destination if locked"
                hint="If copy fails with Access Denied, rename the locked destination to name_locked_N.ext and retry the copy."
                checked={!!flags.renameLocked}
                onCheckedChange={(v) => onPatch((t) => { t.renameLocked = v; })}
            />
        </div>
    );
}

function FlagSwitch({ label, hint, checked, onCheckedChange, }: { label: string; hint: string; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    return (
        <Label className="text-[0.65rem] text-muted-foreground font-normal cursor-pointer flex items-center gap-1" title={hint}>
            <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
            <span className="mt-0.5">{label}</span>
        </Label>
    );
}

function OperationNameField({ item }: { item: CopyOpItem; }) {
    const baseName = sourceFileBaseName(item.sourceFile);

    return (
        <LabelAndField label="Operation name">
            <Input
                value={item.name ?? baseName}
                onChange={(e) => {
                    const next = e.target.value;
                    patchSelectedItem((it) => {
                        const base = sourceFileBaseName(it.sourceFile);
                        if (next === base) {
                            delete it.name;
                        } else {
                            it.name = next;
                        }
                    });
                }}
                onBlur={() => {
                    if (!item.name?.trim()) {
                        patchSelectedItem((it) => { delete it.name; });
                    }
                }}
                placeholder={baseName || "Operation name"}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

function LabelAndField({ label, children }: { label: string; children: ReactNode; }) {
    // Keep Label and Input as siblings — Label's select-none must not wrap the input
    // or caret placement breaks when typing at the start of the value.
    return (
        <Label className="text-xs font-normal whitespace-nowrap flex flex-col items-start gap-0.5">
            <div className="text-[0.65rem] text-muted-foreground whitespace-nowrap">
                {label}
            </div>
            {children}
        </Label >
    );
}
