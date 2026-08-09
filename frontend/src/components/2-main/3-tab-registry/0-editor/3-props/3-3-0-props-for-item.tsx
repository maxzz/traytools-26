import { useSetAtom } from "jotai";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/props-3-field-comment";
import { Field_TypeIcon, InfoTooltip, LabelAndField, PropsActionButton, typeBadgeIcons } from "@/components/2-main/a-shared/props-1-shared-controls";
import { PropsMoreSection } from "@/components/2-main/a-shared/props-4-more-section";
import { type RegGroup, type RegItem, type RegView, countGroupValues, derivedItemLabel, itemHasSubKey } from "../../a-atoms/9-types-registry";
import { patchSelectedItem } from "../../a-atoms/use-selected-node";
import { doAsyncRegJumpItemAtom, doAsyncRegReadItemAtom, doAsyncRegWriteGroupAtom, doAsyncRegWriteItemAtom } from "../../a-atoms/2-run-registry";
import { Field_KeyPath } from "./3-3-1-field-keypath";
import { Field_ItemValues } from "./3-3-2-values";

export function PropsFor_Item({ item, group }: { item: RegItem; group: RegGroup; }) {
    const readItem = useSetAtom(doAsyncRegReadItemAtom);
    const writeItem = useSetAtom(doAsyncRegWriteItemAtom);
    const writeGroup = useSetAtom(doAsyncRegWriteGroupAtom);
    const jump = useSetAtom(doAsyncRegJumpItemAtom);

    const uid = item.uid;
    const hasKey = itemHasSubKey(item);
    const parentHasValues = countGroupValues(group) > 0;

    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon label="Registry key" icon={typeBadgeIcons.registry} />
            
            <div className="flex items-center gap-2">
                <PropsActionButton
                    label="Write parent group"
                    disabled={!parentHasValues || !group.uid}
                    title="Write every value in this key's parent group"
                    onClick={() => group.uid && void writeGroup(group.uid)}
                />
                <PropsActionButton
                    label="Read current"
                    disabled={!hasKey || !uid}
                    title="Read every value of this key from the registry"
                    onClick={() => uid && void readItem(uid)}
                />
                <PropsActionButton
                    label="Write"
                    disabled={!hasKey || !uid}
                    title="Write every value of this key to the registry"
                    onClick={() => uid && void writeItem(uid)}
                />
            </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-1 items-end">
            <Field_KeyPath item={item} onJump={() => uid && void jump(uid)} />
            <Field_View item={item} />
        </div>

        <Field_ItemValues item={item} />

        <PropsMoreSection>
            <Field_ItemName item={item} />

            <Field_Comment
                value={item.comment ?? ""}
                onChange={(next) => patchSelectedItem((it) => applyComment(it, next))}
            />
        </PropsMoreSection>
    </>);
}

// ---------------------------------------------------------------------------
// Key fields

function Field_View({ item }: { item: RegItem; }) {
    const current: ViewCycle = item.view === "32" || item.view === "64" ? item.view : "curr";
    const label = current === "curr" ? "--" : current;

    return (
        <LabelAndField
            className="flex flex-col"
            label="View"
            labelHint={(
                <InfoTooltip label="View help" contentClasses="max-w-72 font-light">
                    <div className="text-xs flex flex-col gap-0.5">
                        <p>Which registry view to use when reading or writing.</p>
                        <p><span className="font-mono tracking-tighter font-medium">--</span> — process native view (i.e. default)</p>
                        <p><span className="font-mono tracking-tighter font-medium">32</span> — 32-bit (WOW6432Node) view</p>
                        <p><span className="font-mono tracking-tighter font-medium">64</span> — 64-bit view</p>
                        <p>Click the control to cycle.</p>
                    </div>
                </InfoTooltip>
            )}
        >
            <Button
                type="button"
                variant="outline"
                size="xs"
                className="h-7 font-normal rounded"
                title={`${label} — click to cycle view`}
                aria-label={`Registry view: ${label}. Click to cycle.`}
                onClick={
                    () => patchSelectedItem((it) => {
                        const cur: ViewCycle = it.view === "32" || it.view === "64" ? it.view : "curr";
                        const next = VIEW_CYCLE[(VIEW_CYCLE.indexOf(cur) + 1) % VIEW_CYCLE.length];
                        if (next === "curr") {
                            delete it.view;
                        } else {
                            it.view = next as RegView;
                        }
                    }
                    )}
            >
                {label}
            </Button>
        </LabelAndField>
    );
}

const VIEW_CYCLE = ["curr", "32", "64"] as const;
type ViewCycle = (typeof VIEW_CYCLE)[number];

function Field_ItemName({ item }: { item: RegItem; }) {
    const derived = derivedItemLabel(item);

    return (
        <LabelAndField label="Display name">
            <Input
                value={item.name ?? derived}
                onChange={(e) => {
                    const next = e.target.value;
                    patchSelectedItem((it) => {
                        if (next === derivedItemLabel(it)) {
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
                placeholder={derived}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}
