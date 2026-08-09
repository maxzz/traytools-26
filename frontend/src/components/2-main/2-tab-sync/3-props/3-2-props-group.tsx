import { Input } from "@/ui/shadcn/input";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/props-3-field-comment";
import { Field_TypeIcon, LabelAndField, typeBadgeIcons } from "@/components/2-main/a-shared/props-1-shared-controls";
import { PropsMoreSection } from "@/components/2-main/a-shared/props-4-more-section";
import { type SyncGroup } from "../a-atoms/9-types-sync";
import { patchSelectedGroup } from "../a-atoms/use-selected-node";
import { QuickAccessList } from "./3-4-quick-list";

export function PropsFor_Group({ group }: { group: SyncGroup; }) {
    return (<>
        <Field_TypeIcon label="Group" icon={typeBadgeIcons.folder} />

        <QuickAccessList nodes={[group]} />

        <PropsMoreSection>
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
        </PropsMoreSection>
    </>);
}
