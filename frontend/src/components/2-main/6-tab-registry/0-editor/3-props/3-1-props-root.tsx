import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/field-comment";
import { Field_TypeIcon, FlagSwitch, PropsActionButton } from "@/components/2-main/a-shared/props-field-ui";
import { type RegGroup, type RegSeparator, countGroupValues } from "../../a-atoms/9-types-registry";
import { patchSelectedSeparator } from "../../a-atoms/use-selected-node";
import { registryEditorStore } from "../../a-atoms/0-registry-local-storage";
import { confirmRegistryWritesAtom, doAsyncRegReadAllAtom } from "../../a-atoms/2-run-registry";
import { QuickAccessList } from "./3-4-quick-list";

export function PropsFor_Root() {
    const { config } = useSnapshot(registryEditorStore, { sync: true });
    const groups = config.groups as RegGroup[];
    const readAll = useSetAtom(doAsyncRegReadAllAtom);
    const hasItems = groups.some((group) => countGroupValues(group) > 0);

    return (<>
        <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground">
                Root of the registry operations tree. Add groups here, or drop a .reg or .json file onto the tree
                to import one as a new group. Groups and keys can be reordered by drag-and-drop; the values of a
                key are reordered in its properties. This node cannot be moved or deleted.
            </p>
        </div>

        <Field_Comment
            value={config.comment ?? ""}
            onChange={(next) => applyComment(registryEditorStore.config, next)}
        />

        <div className="flex items-center gap-2">
            <PropsActionButton label="Read all current values" disabled={!hasItems} onClick={() => void readAll()} />
            <ConfirmWritesToggle />
        </div>

        <QuickAccessList nodes={groups} />
    </>);
}

export function PropsFor_Separator({ separator }: { separator: RegSeparator; }) {
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

function ConfirmWritesToggle() {
    const [confirm, setConfirm] = useAtom(confirmRegistryWritesAtom);

    return (
        <FlagSwitch
            label="Confirm before writing"
            title="Show a confirmation dialog before any registry write. Registry edits cannot be undone from here."
            checked={confirm}
            onCheckedChange={setConfirm}
        />
    );
}
