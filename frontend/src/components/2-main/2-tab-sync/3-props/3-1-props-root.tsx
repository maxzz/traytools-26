import { useSnapshot } from "valtio";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/props-3-field-comment";
import { Field_TypeIcon } from "@/components/2-main/a-shared/props-1-shared-controls";
import { PropsMoreSection } from "@/components/2-main/a-shared/props-4-more-section";
import { type SyncGroup, type SyncSeparator } from "../a-atoms/9-types-sync";
import { patchSelectedSeparator } from "../a-atoms/use-selected-node";
import { syncEditorStore } from "../a-atoms/0-sync-local-storage";
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

        <Field_Comment
            value={config.comment ?? ""}
            onChange={(next) => applyComment(syncEditorStore.config, next)}
        />

        <QuickAccessList nodes={groups} />
    </>);
}

export function PropsFor_Separator({ separator }: { separator: SyncSeparator; }) {
    return (<>
        <Field_TypeIcon label="Separator" />

        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the tree and in the quick actions list.
        </p>

        <PropsMoreSection>
            <Field_Comment
                value={separator.comment ?? ""}
                onChange={(next) => patchSelectedSeparator((s) => applyComment(s, next))}
            />
        </PropsMoreSection>
    </>);
}
