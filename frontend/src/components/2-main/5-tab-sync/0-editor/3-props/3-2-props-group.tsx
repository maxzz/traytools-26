import { Input } from "@/ui/shadcn/input";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/field-comment";
import { type SyncGroup } from "../../a-atoms/9-types-sync";
import { patchSelectedGroup } from "../../a-atoms/use-selected-node";
import { Field_TypeIcon, LabelAndField } from "./3-1-props-root";
import { QuickAccessList } from "./3-4-quick-list";

export function PropsFor_Group({ group }: { group: SyncGroup; }) {
    return (<>
        <Field_TypeIcon kind="group" />

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

        <QuickAccessList nodes={[group]} />
    </>);
}
