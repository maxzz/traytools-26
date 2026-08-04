// Values table for the selected registry key: one row per named value, with
// drag-to-reorder, per-row read / write, and add / delete.

import { type PointerEvent } from "react";
import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Reorder, useDragControls } from "motion/react";
import { cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { ArrowDownToLine, GripVertical, PencilLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Textarea } from "@/ui/shadcn/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/ui/shadcn/select";
import { InfoTooltip, labelClasses } from "@/components/2-main/a-shared/props-field-ui";
import {
    type RegItem,
    type RegValue,
    type RegValueType,
    REG_VALUE_TYPES,
    VALUE_TYPE_LONG_LABELS,
    VALUE_TYPE_SHORT_LABELS,
    itemHasSubKey,
    valueDisplayName,
} from "../../a-atoms/9-types-registry";
import {
    type RegReadState,
    doAsyncRegReadValueAtom,
    doAsyncRegWriteValueAtom,
    readMatchesDesired,
    registryReadStore,
} from "../../a-atoms/2-run-registry";
import {
    addSelectedItemValue,
    patchSelectedValue,
    removeSelectedItemValue,
    reorderSelectedItemValues,
} from "../../a-atoms/use-selected-node";

/** Column widths shared by the header and the value rows. */
const COL = {
    handle: "w-4 shrink-0",
    name: "flex-1 min-w-16",
    type: "w-22 shrink-0",
    newValue: "flex-[1.3] min-w-16",
    current: "flex-1 min-w-16",
    actions: "w-[4.75rem] shrink-0",
};

export function Field_ItemValues({ item }: { item: RegItem; }) {
    const values = item.values ?? [];
    const uids = values.map((value) => value.uid ?? "");
    const canDelete = values.length > 1;
    const hasKey = itemHasSubKey(item);

    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-0.5">
                    <Label className={labelClasses}>Values</Label>
                    <InfoTooltip label="Values help" contentClasses="max-w-64">
                        <p className="text-xs">
                            Every value written under this key. Drag a row by its handle to reorder,
                            and use the row buttons to read or write that one value.
                        </p>
                    </InfoTooltip>
                </div>

                <Button
                    className="px-1.5 h-5.5 font-normal"
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

            <div className="border rounded">
                <HeaderRow />

                <Reorder.Group
                    as="ul"
                    axis="y"
                    values={uids}
                    onReorder={reorderSelectedItemValues}
                    className="flex flex-col"
                >
                    {values.map(
                        (value) => (
                            <ValueRow
                                key={value.uid}
                                value={value}
                                canDelete={canDelete}
                                hasKey={hasKey}
                            />
                        )
                    )}
                </Reorder.Group>
            </div>
        </div>
    );
}

function HeaderRow() {
    return (
        <div className={cn(labelClasses, "px-1 py-0.5 bg-muted/50 border-b rounded-t flex items-center gap-1")}>
            <span className={COL.handle} />
            <span className={COL.name}>Value name</span>
            <span className={COL.type}>Type</span>
            <span className={COL.newValue}>New value</span>
            <span className={COL.current}>Current value</span>
            <span className={COL.actions} />
        </div>
    );
}

function ValueRow({ value, canDelete, hasKey }: { value: RegValue; canDelete: boolean; hasKey: boolean; }) {
    const controls = useDragControls();
    const readValue = useSetAtom(doAsyncRegReadValueAtom);
    const writeValue = useSetAtom(doAsyncRegWriteValueAtom);
    const uid = value.uid ?? "";
    const runnable = hasKey && !!uid;
    const multiline = value.valueType === "REG_MULTI_SZ" || value.valueType === "REG_BINARY";

    return (
        <Reorder.Item
            value={uid}
            dragListener={false}
            dragControls={controls}
            className="px-1 py-1 bg-background not-last:border-b last:rounded-b flex items-start gap-1"
            // Shadow starts at a matching zero-value so the drag lift interpolates cleanly.
            style={{ boxShadow: "0 0 0 0 rgb(0 0 0 / 0)" }}
            whileDrag={{ scale: 1.01, boxShadow: "0 4px 12px 0 rgb(0 0 0 / 0.18)" }}
            transition={{ type: "spring", visualDuration: 0.22, bounce: 0.18 }}
        >
            <button
                className={cn(COL.handle, "h-7 text-muted-foreground/60 hover:text-foreground touch-none cursor-grab active:cursor-grabbing flex items-center justify-center")}
                type="button"
                title="Drag to reorder"
                aria-label="Drag to reorder value"
                tabIndex={-1}
                onPointerDown={(e: PointerEvent) => {
                    e.preventDefault();
                    controls.start(e);
                }}
            >
                <GripVertical className="size-3.5" />
            </button>

            <Input
                className={cn(COL.name, "px-1.5 h-7 text-[0.72rem]")}
                value={value.valueName}
                placeholder="(Default)"
                title={valueDisplayName(value.valueName)}
                aria-label="Value name"
                onChange={(e) => patchSelectedValue(uid, (v) => { v.valueName = e.target.value; })}
                {...turnOffAutoComplete}
            />

            <ValueTypeSelect uid={uid} valueType={value.valueType} />

            {multiline
                ? (
                    // field-sizing-content grows the box with the text; max-h keeps rows compact.
                    <Textarea
                        className={cn(COL.newValue, "px-1.5 py-1 min-h-7 max-h-24 font-mono text-[0.72rem] resize-none")}
                        rows={1}
                        value={value.newValue}
                        placeholder={VALUE_PLACEHOLDERS[value.valueType]}
                        title={valueHint(value.valueType)}
                        aria-label="New value"
                        onChange={(e) => patchSelectedValue(uid, (v) => { v.newValue = e.target.value; })}
                        {...turnOffAutoComplete}
                    />
                )
                : (
                    <Input
                        className={cn(COL.newValue, "px-1.5 h-7 text-[0.72rem]")}
                        value={value.newValue}
                        placeholder={VALUE_PLACEHOLDERS[value.valueType]}
                        title={valueHint(value.valueType)}
                        aria-label="New value"
                        onChange={(e) => patchSelectedValue(uid, (v) => { v.newValue = e.target.value; })}
                        {...turnOffAutoComplete}
                    />
                )
            }

            <CurrentValueCell value={value} />

            <div className={cn(COL.actions, "h-7 flex items-center justify-end gap-0.5")}>
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

                <Button
                    variant="ghost"
                    size="icon-xs"
                    type="button"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    disabled={!canDelete}
                    title={canDelete ? "Delete this value" : "A key keeps at least one value"}
                    aria-label="Delete this value"
                    onClick={() => removeSelectedItemValue(uid)}
                >
                    <Trash2 className="size-3" />
                </Button>
            </div>
        </Reorder.Item>
    );
}

function ValueTypeSelect({ uid, valueType }: { uid: string; valueType: RegValueType; }) {
    return (
        <Select value={valueType} onValueChange={(next) => patchSelectedValue(uid, (v) => { v.valueType = next as RegValueType; })}>
            <SelectTrigger
                className={cn(COL.type, "px-1.5 w-18 h-7! text-[0.72rem] [&>svg]:size-2.5")}
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

/** Last value read back from the machine for this row, with a match indicator. */
function CurrentValueCell({ value }: { value: RegValue; }) {
    const { byUid } = useSnapshot(registryReadStore);
    const read: RegReadState | undefined = value.uid ? byUid[value.uid] : undefined;
    const { text, title, className } = currentValueLook(read, value);

    return (
        <div
            className={cn(COL.current, "px-1.5 h-7 text-[0.72rem] bg-muted/40 border border-transparent rounded flex items-center")}
            title={title}
            aria-label={`Current value — ${title.replace(/\n/g, ". ")}`}
        >
            <span className={cn("truncate", className)}>{text}</span>
        </div>
    );
}

function currentValueLook(read: RegReadState | undefined, value: RegValue): { text: string; title: string; className: string; } {
    if (!read) {
        return { text: "not read", title: "Use the read button to query the registry", className: "text-muted-foreground/60 italic" };
    }
    if (read.loading) {
        return { text: "reading…", title: "Reading from the registry", className: "text-muted-foreground italic" };
    }
    if (read.error) {
        return { text: read.error, title: read.error, className: "text-destructive" };
    }
    if (!read.exists) {
        return {
            text: "absent",
            title: "Not present in the registry. Writing will create it.",
            className: "text-amber-700 dark:text-amber-500 italic",
        };
    }

    const matches = readMatchesDesired(read, value);
    const current = read.value ?? "";
    const typeNote = read.valueType && read.valueType !== value.valueType ? `\nOn machine: ${read.valueType}` : "";

    return {
        text: current || "(empty)",
        title: `${matches ? "Matches the new value" : "Differs from the new value"}\n${current}${typeNote}`,
        className: matches
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-orange-700 dark:text-orange-400",
    };
}

/** Placeholder text showing the canonical form expected for each value type. */
const VALUE_PLACEHOLDERS: Record<RegValueType, string> = {
    REG_SZ: "Some text",
    REG_EXPAND_SZ: "%SystemRoot%\\System32",
    REG_DWORD: "0 or 0x0000ffff",
    REG_QWORD: "0 or 0x00000000ffffffff",
    REG_BINARY: "de,ad,be,ef",
    REG_MULTI_SZ: "One string per line",
};

function valueHint(type: RegValueType): string {
    switch (type) {
        case "REG_DWORD":
        case "REG_QWORD":
            return "Decimal, or hexadecimal with a 0x prefix.";
        case "REG_BINARY":
            return "Hex byte pairs, separated by commas or spaces.";
        case "REG_MULTI_SZ":
            return "One string per line.";
        case "REG_EXPAND_SZ":
            return "Stored unexpanded; %VARS% resolve when the value is read by Windows.";
        default:
            return "Stored as written.";
    }
}
