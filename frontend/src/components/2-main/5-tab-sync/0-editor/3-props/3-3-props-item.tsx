import { Input } from "@/ui/shadcn/input";
import { Button } from "@/ui/shadcn/button";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { CollapsibleOptionalField } from "@/components/2-main/a-shared/collapsible-optional-field";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/field-comment";
import { PathInput } from "@/components/2-main/a-shared/path-input";
import { syncOpsBus } from "@/bridge";
import { type SyncGroup, type SyncOpItem, findByUid, folderBaseName, syncDirectionName } from "../../a-atoms/9-types-sync";
import { patchSelectedItem } from "../../a-atoms/use-selected-node";
import { syncEditorStore } from "../../a-atoms/0-sync-local-storage";
import { runCheck, runSyncItem } from "../../a-atoms/2-run-sync";
import { Field_TypeIcon, LabelAndField, typeBadgeIcons } from "@/components/2-main/a-shared/props-field-ui";

export function PropsFor_Item({ item }: { item: SyncOpItem; group: SyncGroup; }) {
    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon label="Sync item" icon={typeBadgeIcons.file} />
            <ItemActionButtons item={item} />
        </div>

        <Field_Comment
            value={item.comment ?? ""}
            onChange={(next) => patchSelectedItem((it) => applyComment(it, next))}
        />

        <LabelAndField label="Source folder">
            <PathInput
                kind="folder"
                value={item.sourceFolder}
                onChange={(path) => patchSelectedItem((it) => { it.sourceFolder = path; })}
                pickPath={(initial) => syncOpsBus.pickFolder(initial)}
                showReveal
            />
        </LabelAndField>

        <LabelAndField label="Destination folder">
            <PathInput
                kind="folder"
                value={item.destFolder}
                onChange={(path) => patchSelectedItem((it) => { it.destFolder = path; })}
                pickPath={(initial) => syncOpsBus.pickFolder(initial)}
                showReveal
            />
        </LabelAndField>

        <OperationNameField item={item} />

        <DirectionNameField
            item={item}
            field="forwardName"
            label="Sync → name"
            placeholder="Optional name for source → destination"
        />
        
        <DirectionNameField
            item={item}
            field="reverseName"
            label="Sync ← name"
            placeholder="Optional name for destination → source"
        />
    </>);
}

function ItemActionButtons({ item }: { item: SyncOpItem; }) {
    const canRun = !!(item.sourceFolder.trim() && item.destFolder.trim());
    const uid = item.uid;
    const forwardName = syncDirectionName(item, "forward");
    const reverseName = syncDirectionName(item, "reverse");

    function withLiveItem(run: (live: SyncOpItem) => void) {
        if (!uid) {
            return;
        }
        const loc = findByUid(syncEditorStore.config, uid);
        if (loc?.kind === "item") {
            run(loc.item);
        }
    }

    return (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
            <SyncActionButton
                label={forwardName || "Sync →"}
                disabled={!canRun}
                title="Sync source folder into destination"
                onClick={() => withLiveItem((live) => runSyncItem(live, "forward"))}
            />
            <SyncActionButton
                label={reverseName || "Sync ←"}
                disabled={!canRun}
                title="Sync destination folder into source"
                onClick={() => withLiveItem((live) => runSyncItem(live, "reverse"))}
            />
            <SyncActionButton
                label="Check"
                disabled={!canRun}
                title="Compare folders and show a short summary"
                onClick={() => withLiveItem((live) => runCheck(live, "summary"))}
            />
            <SyncActionButton
                label="Check Details"
                disabled={!canRun}
                title="Compare folders and show the CLI-style difference tree"
                onClick={() => withLiveItem((live) => runCheck(live, "details"))}
            />
        </div>
    );
}

function SyncActionButton({ label, disabled, title, onClick }: { label: string; disabled: boolean; title?: string; onClick: () => void; }) {
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

function OperationNameField({ item }: { item: SyncOpItem; }) {
    const baseName = folderBaseName(item.sourceFolder);

    return (
        <LabelAndField label="Operation name">
            <Input
                value={item.name ?? baseName}
                onChange={(e) => {
                    const next = e.target.value;
                    patchSelectedItem((it) => {
                        const base = folderBaseName(it.sourceFolder);
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

function DirectionNameField({ item, field, label, placeholder }: { item: SyncOpItem; field: "forwardName" | "reverseName"; label: string; placeholder: string; }) {
    const value = item[field] ?? "";

    return (
        <CollapsibleOptionalField label={label} value={value}>
            <Input
                className="h-7"
                value={value}
                onChange={(e) => {
                    const next = e.target.value;
                    patchSelectedItem((it) => {
                        if (next.trim()) {
                            it[field] = next;
                        } else {
                            delete it[field];
                        }
                    });
                }}
                onBlur={() => {
                    if (!item[field]?.trim()) {
                        patchSelectedItem((it) => { delete it[field]; });
                    } else {
                        patchSelectedItem((it) => { it[field] = it[field]!.trim(); });
                    }
                }}
                placeholder={placeholder}
                {...turnOffAutoComplete}
            />
        </CollapsibleOptionalField>
    );
}
