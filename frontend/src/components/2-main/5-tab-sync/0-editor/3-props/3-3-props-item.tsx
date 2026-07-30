import { Input } from "@/ui/shadcn/input";
import { Button } from "@/ui/shadcn/button";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { PathInput } from "@/components/2-main/a-shared/path-input";
import { syncOpsBus } from "@/bridge";
import { type SyncGroup, type SyncOpItem, findByUid, folderBaseName } from "../../a-atoms/9-types-sync";
import { patchSelectedItem } from "../../a-atoms/use-selected-node";
import { syncEditorStore } from "../../a-atoms/0-sync-local-storage";
import { runCheckDetails, runCheckItem, runSyncItem } from "../../a-atoms/2-run-sync";
import { Field_TypeIcon, LabelAndField } from "./3-1-props-root";

export function PropsFor_Item({ item }: { item: SyncOpItem; group: SyncGroup; }) {
    const canRun = !!(item.sourceFolder.trim() && item.destFolder.trim());

    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon kind="item" />
            <div className="flex flex-wrap items-center justify-end gap-1.5">
                <SyncActionButton
                    label="Sync →"
                    disabled={!canRun}
                    title="Sync source folder into destination"
                    onClick={() => syncLiveItem(item.uid, "forward")}
                />
                <SyncActionButton
                    label="Sync ←"
                    disabled={!canRun}
                    title="Sync destination folder into source"
                    onClick={() => syncLiveItem(item.uid, "reverse")}
                />
                <SyncActionButton
                    label="Check"
                    disabled={!canRun}
                    title="Compare folders and show a short summary"
                    onClick={() => checkLiveItem(item.uid)}
                />
                <SyncActionButton
                    label="Check Details"
                    disabled={!canRun}
                    title="Compare folders and show the CLI-style difference tree"
                    onClick={() => checkDetailsLiveItem(item.uid)}
                />
            </div>
        </div>

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
    </>);
}

function syncLiveItem(uid: string | undefined, direction: "forward" | "reverse") {
    if (!uid) {
        return;
    }
    const loc = findByUid(syncEditorStore.config, uid);
    if (loc?.kind === "item") {
        runSyncItem(loc.item, direction);
    }
}

function checkLiveItem(uid: string | undefined) {
    if (!uid) {
        return;
    }
    const loc = findByUid(syncEditorStore.config, uid);
    if (loc?.kind === "item") {
        runCheckItem(loc.item);
    }
}

function checkDetailsLiveItem(uid: string | undefined) {
    if (!uid) {
        return;
    }
    const loc = findByUid(syncEditorStore.config, uid);
    if (loc?.kind === "item") {
        runCheckDetails(loc.item);
    }
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
