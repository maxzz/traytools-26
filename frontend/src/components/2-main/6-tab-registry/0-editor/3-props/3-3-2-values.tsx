import { useState, type Dispatch, type PointerEvent, type SetStateAction } from "react";
import { useSetAtom } from "jotai";
import { classNames, cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Reorder, useDragControls, type DragControls } from "motion/react";
import { ArrowDownToLine, GripVertical, PencilLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { InfoTooltip, labelClasses } from "@/components/2-main/a-shared/props-field-ui";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/ui/shadcn/select";
import { COL_Classes, TableHeaderRow, SUBGRID_ROW_Classes, TABLE_CELL_CONTROL_Classes, tableGridClasses } from "./3-3-3-values-header";
import { Column_NewValueCell } from "./3-3-4-values-value-new";
import { Column_CurrentValue } from "./3-3-5-values-value-current";
import { type RegItem, type RegValue, type RegValueType, REG_VALUE_TYPES, VALUE_TYPE_LONG_LABELS, VALUE_TYPE_SHORT_LABELS, itemHasSubKey, valueDisplayName } from "../../a-atoms/9-types-registry";
import { doAsyncRegReadValueAtom, doAsyncRegWriteValueAtom, } from "../../a-atoms/2-run-registry";
import { addSelectedItemValue, patchSelectedValue, removeSelectedItemValue, reorderSelectedItemValues } from "../../a-atoms/use-selected-node";

export function Field_ItemValues({ item }: { item: RegItem; }) {
    const values = item.values ?? [];
    const uids = values.map((value) => value.uid ?? "");
    const [editOrder, setEditOrder] = useState(false);

    return (
        <div className="flex flex-col gap-0.5">
            <SectionHeader editOrder={editOrder} setEditOrder={setEditOrder} />

            <div className={classNames("border rounded", tableGridClasses(editOrder))}>
                <TableHeaderRow item={item} editOrder={editOrder} />

                <Reorder.Group
                    className={classNames(SUBGRID_ROW_Classes, "m-0 p-0 list-none")}
                    as="ul"
                    axis="y"
                    values={uids}
                    onReorder={reorderSelectedItemValues}
                >
                    {values.map(
                        (value, index) => (
                            <ValueRow
                                key={value.uid}
                                value={value}
                                item={item}
                                isLast={index === values.length - 1}
                                editOrder={editOrder}
                            />
                        )
                    )}
                </Reorder.Group>
            </div>
        </div>
    );
}

function ValueRow({ value, item, isLast, editOrder }: { value: RegValue; item: RegItem; isLast: boolean; editOrder: boolean; }) {
    const controls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    const uid = value.uid ?? "";

    return (
        <Reorder.Item
            value={uid}
            dragListener={false}
            dragControls={controls}
            // Index-based last-row styles: Motion can freeze :last-child rules as inline styles.
            className={classNames(
                SUBGRID_ROW_Classes,
                "relative bg-background items-start",
                !isLast && "border-b",
                isLast && "rounded-b",
                isDragging && "z-10 scale-[1.01] shadow-[0_4px_12px_0_rgb(0_0_0/0.18)]",
            )}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
        >
            <Input
                className={cn(COL_Classes.name, TABLE_CELL_CONTROL_Classes, "w-full px-1.5 py-0! h-7 text-[0.72rem]")}
                value={value.valueName}
                placeholder="(Default)"
                title={valueDisplayName(value.valueName)}
                aria-label="Value name"
                onChange={(e) => patchSelectedValue(uid, (v) => { v.valueName = e.target.value; })}
                {...turnOffAutoComplete}
            />

            <Column_Type uid={uid} valueType={value.valueType} />
            <Column_NewValueCell uid={uid} value={value} />
            <Column_CurrentValue value={value} />
            <Column_RowActions uid={uid} item={item} controls={controls} editOrder={editOrder} />
        </Reorder.Item>
    );
}

// ---------------------------------------------------------------------------

function Column_Type({ uid, valueType }: { uid: string; valueType: RegValueType; }) {
    return (
        <Select value={valueType} onValueChange={(next) => patchSelectedValue(uid, (v) => { v.valueType = next as RegValueType; })}>
            <SelectTrigger
                className={cn(COL_Classes.type, TABLE_CELL_CONTROL_Classes, "w-full px-1.5 h-7! text-[0.72rem] [&>svg]:size-2.5")}
                title={VALUE_TYPE_LONG_LABELS[valueType]}
                aria-label="Value type"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <span className="truncate">{VALUE_TYPE_SHORT_LABELS[valueType]}</span>
            </SelectTrigger>

            {/* popper: item-aligned mispositions the list inside Motion Reorder rows */}
            <SelectContent position="popper" align="start">
                {REG_VALUE_TYPES.map(
                    (type) => (
                        <SelectItem key={type} value={type}>
                            {VALUE_TYPE_LONG_LABELS[type]}
                        </SelectItem>
                    )
                )}
            </SelectContent>
        </Select>
    );
}

function Column_RowActions({ uid, item, controls, editOrder }: { uid: string; item: RegItem; controls: DragControls; editOrder: boolean; }) {
    const readValue = useSetAtom(doAsyncRegReadValueAtom);
    const writeValue = useSetAtom(doAsyncRegWriteValueAtom);
    const runnable = itemHasSubKey(item) && !!uid;
    const canDelete = (item.values?.length ?? 0) > 1;

    return (
        <div className={classNames(COL_Classes.actions, "h-7 flex items-center justify-end gap-0.5")}>
            {editOrder && (
                <>
                    <button
                        className={classNames(COL_Classes.handle, "h-7 text-muted-foreground/60 hover:text-foreground touch-none cursor-grab active:cursor-grabbing flex items-center justify-center")}
                        type="button"
                        title="Drag to reorder"
                        aria-label="Drag to reorder value"
                        tabIndex={-1}
                        onPointerDown={(e: PointerEvent) => {
                            e.preventDefault();
                            controls.start(e);
                        }}
                    >
                        <GripVertical className="size-3" />
                    </button>

                    <Button
                        variant="ghost"
                        size="icon-xs"
                        type="button"
                        className="mr-2 size-6 text-muted-foreground hover:text-destructive"
                        disabled={!canDelete}
                        title={canDelete ? "Delete this value" : "A key keeps at least one value"}
                        aria-label="Delete this value"
                        onClick={() => removeSelectedItemValue(uid)}
                    >
                        <Trash2 className="size-3" />
                    </Button>
                </>
            )}

            <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                className="size-6"
                disabled={!runnable}
                title={runnable ? "Read this value from the registry" : "Set a key path first"}
                aria-label="Read current value"
                onClick={() => void readValue(uid)}
            >
                <ArrowDownToLine className="size-3" />
            </Button>

            <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                className="size-6"
                disabled={!runnable}
                title={runnable ? "Write this value to the registry" : "Set a key path first"}
                aria-label="Write this value"
                onClick={() => void writeValue(uid)}
            >
                <PencilLine className="size-3" />
            </Button>

        </div>
    );
}

function SectionHeader({ editOrder, setEditOrder }: { editOrder: boolean; setEditOrder: Dispatch<SetStateAction<boolean>>; }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-0.5">
                <Label className={labelClasses}>
                    Values
                </Label>
                <InfoTooltip label="Values help" contentClasses="max-w-64">
                    <p className="text-xs">
                        Every value written under this key. Turn on Edit order to drag rows and
                        delete values; use the row buttons to read or write that one value.
                    </p>
                </InfoTooltip>
            </div>

            <div className="inline-flex items-center gap-1">
                <Button
                    className={classNames("px-1.5 h-5.5 font-normal text-muted-foreground hover:text-foreground active:not-aria-[haspopup]:scale-100", editOrder ? "bg-secondary text-secondary-foreground" : "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50")}
                    variant="outline"
                    size="xs"
                    type="button"
                    title={editOrder ? "Hide drag and delete controls" : "Show drag and delete controls"}
                    aria-pressed={editOrder}
                    onClick={() => setEditOrder((on) => !on)}
                >
                    <GripVertical className="size-3" />
                    Edit order
                </Button>
                <Button
                    className="px-1.5 h-5.5 font-normal text-muted-foreground hover:text-foreground"
                    variant="outline"
                    size="xs"
                    type="button"
                    title="Add a value to this key"
                    onClick={addSelectedItemValue}
                >
                    <Plus className="size-3" />
                    Add value
                </Button>
            </div>
        </div>
    );
}
