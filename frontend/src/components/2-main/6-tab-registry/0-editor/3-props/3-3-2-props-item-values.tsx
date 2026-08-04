// Values table for the selected registry key: one row per named value, with
// drag-to-reorder, per-row read / write, and add / delete.

import { useState, type PointerEvent } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
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
    type RegNumericRadix,
    type RegReadState,
    currentValueRadixAtom,
    doAsyncRegReadValueAtom,
    doAsyncRegWriteValueAtom,
    newValueRadixAtom,
    readMatchesDesired,
    registryReadStore,
} from "../../a-atoms/2-run-registry";
import { formatRegNumericText, isNumericRegType } from "../../a-atoms/7-reg-file-format";
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
                        (value, index) => (
                            <ValueRow
                                key={value.uid}
                                value={value}
                                canDelete={canDelete}
                                hasKey={hasKey}
                                isLast={index === values.length - 1}
                            />
                        )
                    )}
                </Reorder.Group>
            </div>
        </div>
    );
}

function HeaderRow() {
    const [newRadix, setNewRadix] = useAtom(newValueRadixAtom);
    const [currentRadix, setCurrentRadix] = useAtom(currentValueRadixAtom);

    return (
        <div className={cn(labelClasses, "px-1 py-0.5 bg-muted/50 border-b rounded-t flex items-center gap-1")}>
            <span className={COL.handle} />
            <span className={COL.name}>Value name</span>
            <span className={COL.type}>Type</span>
            <span className={cn(COL.newValue, "inline-flex items-center gap-0.5")}>
                New value
                <RadixToggle radix={newRadix} onRadixChange={setNewRadix} column="New value" />
            </span>
            <span className={cn(COL.current, "inline-flex items-center gap-0.5")}>
                Current value
                <RadixToggle radix={currentRadix} onRadixChange={setCurrentRadix} column="Current value" />
            </span>
            <span className={COL.actions} />
        </div>
    );
}

/** Tiny 10 ↔ 16 toggle; stays inside the existing header row height. */
function RadixToggle({ radix, onRadixChange, column }: { radix: RegNumericRadix; onRadixChange: (next: RegNumericRadix) => void; column: string; }) {
    const next = radix === 10 ? 16 : 10;
    return (
        <button
            type="button"
            className="px-0.5 h-3 min-w-3 text-[0.58rem] leading-none font-medium tabular-nums text-muted-foreground hover:text-foreground border border-border/70 rounded-sm"
            title={radix === 10
                ? `${column}: decimal — click for hexadecimal`
                : `${column}: hexadecimal — click for decimal`}
            aria-label={`${column} numeric base ${radix}, switch to ${next}`}
            onClick={() => onRadixChange(next)}
        >
            {radix}
        </button>
    );
}

function ValueRow({ value, canDelete, hasKey, isLast }: { value: RegValue; canDelete: boolean; hasKey: boolean; isLast: boolean; }) {
    const controls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
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
            // Index-based last-row styles: Motion can freeze :last-child rules as inline styles.
            className={cn(
                "relative px-1 py-1 bg-background flex items-start gap-1",
                !isLast && "border-b",
                isLast && "rounded-b",
                isDragging && "z-10 scale-[1.01] shadow-[0_4px_12px_0_rgb(0_0_0/0.18)]",
            )}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
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
                    <NewValueInput uid={uid} value={value} />
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

/** Formats DWORD/QWORD for the column radix only when unfocused, so typing stays stable. */
function NewValueInput({ uid, value }: { uid: string; value: RegValue; }) {
    const radix = useAtomValue(newValueRadixAtom);
    const [focused, setFocused] = useState(false);
    const numeric = isNumericRegType(value.valueType);
    const shown = numeric && !focused ? formatRegNumericText(value.newValue, radix) : value.newValue;

    function commitRadixForm(text: string) {
        if (!numeric) {
            return;
        }
        const formatted = formatRegNumericText(text, radix);
        if (formatted !== text) {
            patchSelectedValue(uid, (v) => { v.newValue = formatted; });
        }
    }

    return (
        <Input
            className={cn(COL.newValue, "px-1.5 h-7 text-[0.72rem]", numeric && "font-mono")}
            value={shown}
            placeholder={numericPlaceholder(value.valueType, radix)}
            title={valueHint(value.valueType, radix)}
            aria-label="New value"
            onFocus={() => {
                setFocused(true);
                commitRadixForm(value.newValue);
            }}
            onBlur={(e) => {
                setFocused(false);
                commitRadixForm(e.currentTarget.value);
            }}
            onChange={(e) => patchSelectedValue(uid, (v) => { v.newValue = e.target.value; })}
            {...turnOffAutoComplete}
        />
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
    const currentRadix = useAtomValue(currentValueRadixAtom);
    const { byUid } = useSnapshot(registryReadStore);
    const read: RegReadState | undefined = value.uid ? byUid[value.uid] : undefined;
    const { text, title, className } = currentValueLook(read, value, currentRadix);

    return (
        <div
            className={cn(COL.current, "px-1.5 h-7 text-[0.72rem] bg-muted/40 border border-transparent rounded flex items-center")}
            title={title}
            aria-label={`Current value — ${title.replace(/\n/g, ". ")}`}
        >
            <span className={cn("truncate", className, isNumericRegType(value.valueType) && read?.exists && "font-mono")}>{text}</span>
        </div>
    );
}

function currentValueLook(read: RegReadState | undefined, value: RegValue, radix: RegNumericRadix): { text: string; title: string; className: string; } {
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
    const shown = isNumericRegType(value.valueType) ? formatRegNumericText(current, radix) : current;
    const typeNote = read.valueType && read.valueType !== value.valueType ? `\nOn machine: ${read.valueType}` : "";

    return {
        text: shown || "(empty)",
        title: `${matches ? "Matches the new value" : "Differs from the new value"}\n${shown}${typeNote}`,
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

function numericPlaceholder(type: RegValueType, radix: RegNumericRadix): string {
    if (!isNumericRegType(type)) {
        return VALUE_PLACEHOLDERS[type];
    }
    if (radix === 16) {
        return type === "REG_QWORD" ? "0x0 or 0xffffffffffffffff" : "0x0 or 0xffffffff";
    }
    return "0";
}

function valueHint(type: RegValueType, radix?: RegNumericRadix): string {
    switch (type) {
        case "REG_DWORD":
        case "REG_QWORD":
            return radix === 16
                ? "Hexadecimal with a 0x prefix (decimal is also accepted)."
                : "Decimal, or hexadecimal with a 0x prefix.";
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
