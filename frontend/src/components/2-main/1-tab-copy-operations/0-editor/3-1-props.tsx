import { useSnapshot } from "valtio";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { PathInput } from "@/components/2-main/a-shared/path-input";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/field-comment";
import {
    Field_TypeIcon,
    FlagSwitch,
    LabelAndField,
    PropsActionButton,
    typeBadgeIcons,
} from "@/components/2-main/a-shared/props-field-ui";
import {
    type CopyGroup,
    type CopyOpItem,
    type CopySeparator,
    collectGroupItems,
    findByUid,
    findTopLevelGroup,
    sourceFileBaseName,
} from "../a-atoms/9-types-copy";
import { patchSelectedGroup, patchSelectedItem, patchSelectedSeparator } from "../a-atoms/use-selected-node";
import { copyEditorStore } from "../a-atoms/0-copy-local-storage";
import { runCopyGroup, runCopyItem } from "../a-atoms/2-run-copy";
import { QuickAccessList } from "./3-2-quick-list";

export function PropsFor_Root() {
    const { config } = useSnapshot(copyEditorStore, { sync: true });
    const groups = config.groups as CopyGroup[];

    return (<>
        <p className="text-muted-foreground">
            Root of the copy operations tree. Add groups here. Groups can contain copy items and nested groups
            in one ordered list. Groups and items can be reordered by drag-and-drop. This node cannot be moved or deleted.
        </p>

        <Field_Comment
            value={config.comment ?? ""}
            onChange={(next) => applyComment(copyEditorStore.config, next)}
        />

        <QuickAccessList nodes={groups} />
    </>);
}

export function PropsFor_Group({ group }: { group: CopyGroup; }) {
    const loc = group.uid ? findByUid(copyEditorStore.config, group.uid) : null;
    const isTopLevel = loc?.kind === "group" && loc.parent === null;
    const parent = loc?.kind === "group" ? loc.parent : null;
    const topLevel = group.uid ? findTopLevelGroup(copyEditorStore.config, group.uid) : null;
    const parentHasItems = parent ? collectGroupItems(parent).length > 0 : false;
    const topLevelHasItems = topLevel ? collectGroupItems(topLevel).length > 0 : false;
    // When the parent is already the root-level group, "top-level" would be redundant.
    const showTopLevel = !isTopLevel && !!topLevel && topLevel.uid !== parent?.uid;
    const showParent = !isTopLevel;

    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon label="Group" icon={typeBadgeIcons.folder} />
            {(showTopLevel || showParent) && (
                <div className="flex items-center gap-2">
                    {showTopLevel && (
                        <PropsActionButton
                            label="Copy top-level group"
                            disabled={!topLevelHasItems}
                            title="Copy all items in the root-level group that contains this group"
                            onClick={() => copyLiveGroup(topLevel?.uid)}
                        />
                    )}
                    {showParent && (
                        <PropsActionButton
                            label="Copy parent group"
                            disabled={!parentHasItems}
                            title="Copy all items in this group's parent (including nested groups)"
                            onClick={() => copyLiveGroup(parent?.uid)}
                        />
                    )}
                </div>
            )}
        </div>

        <LabelAndField label="Group name">
            <Input
                className="h-7"
                value={group.name}
                onChange={(e) => patchSelectedGroup((g) => { g.name = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>

        <Field_Comment
            value={group.comment ?? ""}
            onChange={(next) => patchSelectedGroup((g) => applyComment(g, next))}
        />

        <CopyRunFlags flags={group} onPatch={patchSelectedGroup} />

        <QuickAccessList nodes={[group]} />
    </>);
}

export function PropsFor_Separator({ separator }: { separator: CopySeparator; }) {
    return (<>
        <Field_TypeIcon label="Separator" />

        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the tree and in the quick actions list.
        </p>

        <Field_Comment
            value={separator.comment ?? ""}
            onChange={(next) => patchSelectedSeparator((s) => applyComment(s, next))}
        />
    </>);
}

export function PropsFor_Item({ item, group }: { item: CopyOpItem; group: CopyGroup; }) {
    const topLevel = item.uid ? findTopLevelGroup(copyEditorStore.config, item.uid) : null;
    const parentHasItems = collectGroupItems(group).length > 0;
    const topLevelHasItems = topLevel ? collectGroupItems(topLevel).length > 0 : false;
    // When the parent is already the root-level group, "top-level" would be redundant.
    const showTopLevel = !!topLevel && topLevel.uid !== group.uid;

    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon label="Copy item" icon={typeBadgeIcons.file} />
            <div className="flex items-center gap-2">
                {showTopLevel && (
                    <PropsActionButton
                        label="Copy top-level group"
                        disabled={!topLevelHasItems}
                        title="Copy all items in the root-level group that contains this item"
                        onClick={() => copyLiveGroup(topLevel?.uid)}
                    />
                )}
                <PropsActionButton
                    label="Copy parent group"
                    disabled={!parentHasItems}
                    title="Copy all items in this item's parent group (including nested groups)"
                    onClick={() => copyLiveGroup(group.uid)}
                />
                <PropsActionButton
                    label="Copy file"
                    disabled={!item.sourceFile.trim() || !item.destFolder.trim()}
                    onClick={() => copyLiveItem(item.uid)}
                />
            </div>
        </div>

        <Field_Comment
            value={item.comment ?? ""}
            onChange={(next) => patchSelectedItem((it) => applyComment(it, next))}
        />

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

// Copy run flags

type CopyRunFlags = Pick<CopyGroup, "stopDpAgent" | "requireElevated" | "renameLocked">;

function CopyRunFlags({ flags, onPatch, }: { flags: CopyRunFlags; onPatch: (fn: (target: CopyRunFlags) => void) => void; }) {
    return (
        <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <FlagSwitch
                label="Stop DpAgent before copy"
                title="If DpAgent is running, stop it and wait until it is confirmed stopped before copying any items in this group."
                checked={!!flags.stopDpAgent}
                onCheckedChange={(v) => onPatch((t) => { t.stopDpAgent = v; })}
            />

            <FlagSwitch
                label="Require elevated privileges"
                title="Use when destinations include protected folders such as Program Files."
                checked={!!flags.requireElevated}
                onCheckedChange={(v) => onPatch((t) => { t.requireElevated = v; })}
            />

            <FlagSwitch
                label="Rename destination if locked"
                title="If copy fails with 'Access Denied', rename the locked destination to name_locked_N.ext and retry the copy."
                checked={!!flags.renameLocked}
                onCheckedChange={(v) => onPatch((t) => { t.renameLocked = v; })}
            />
        </div>
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
