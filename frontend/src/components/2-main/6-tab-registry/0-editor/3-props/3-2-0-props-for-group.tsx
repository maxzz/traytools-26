import { useSetAtom } from "jotai";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/field-comment";
import {
    Field_TypeIcon,
    LabelAndField,
    PropsActionButton,
    typeBadgeIcons,
} from "@/components/2-main/a-shared/props-shared-controls";
import { PropsMoreSection } from "@/components/2-main/a-shared/props-more-section";
import { type RegGroup, countGroupValues } from "../../a-atoms/9-types-registry";
import { patchSelectedGroup } from "../../a-atoms/use-selected-node";
import { doAsyncRegReadGroupAtom, doAsyncRegWriteGroupAtom } from "../../a-atoms/2-run-registry";
import { QuickAccessList } from "./3-2-1-quick-list";

export function PropsFor_Group({ group }: { group: RegGroup; }) {
    const readGroup = useSetAtom(doAsyncRegReadGroupAtom);
    const writeGroup = useSetAtom(doAsyncRegWriteGroupAtom);
    const hasItems = countGroupValues(group) > 0;
    const uid = group.uid;

    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon label="Group" icon={typeBadgeIcons.folder} />
            <div className="flex items-center gap-2">
                <PropsActionButton
                    label="Read group"
                    disabled={!hasItems || !uid}
                    title="Read the current value of every item in this group"
                    onClick={() => uid && void readGroup(uid)}
                />
                <PropsActionButton
                    label="Write group"
                    disabled={!hasItems || !uid}
                    title="Write every value in this group (including nested groups) to the registry"
                    onClick={() => uid && void writeGroup(uid)}
                />
            </div>
        </div>

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
