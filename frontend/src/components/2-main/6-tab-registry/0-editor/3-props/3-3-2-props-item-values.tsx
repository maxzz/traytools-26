// Values table for the selected registry key: one row per named value, with
// drag-to-reorder, per-row read / write, and add / delete.

import { useState, type PointerEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
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
    type RegHexPadMode,
    type RegHexPrefixMode,
    type RegNumericRadix,
    type RegReadState,
    currentValueHexPadAtom,
    currentValueHexPrefixAtom,
    currentValueRadixAtom,
    doAsyncRegReadValueAtom,
    doAsyncRegWriteValueAtom,
    newValueHexPadAtom,
    newValueHexPrefixAtom,
    newValueRadixAtom,
    readMatchesDesired,
    registryReadStore,
} from "../../a-atoms/2-run-registry";
import { formatRegNumericText, isNumericRegType, toStoredRegNumericText } from "../../a-atoms/7-reg-file-format";
import {
    addSelectedItemValue,
    patchSelectedValue,
    removeSelectedItemValue,
    reorderSelectedItemValues,
} from "../../a-atoms/use-selected-node";
import { COL, HeaderRow } from "./3-3-3-props-item-values-header";

export function Field_ItemValues({ item }: { item: RegItem; }) {
    const values = item.values ?? [];
    const uids = values.map((value) => value.uid ?? "");

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
                                item={item}
                                isLast={index === values.length - 1}
                            />
                        )
                    )}
                </Reorder.Group>
            </div>
        </div>
    );
}

function ValueRow({ value, item, isLast }: { value: RegValue; item: RegItem; isLast: boolean; }) {
    const controls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    const uid = value.uid ?? "";
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

            <ValueRowActions uid={uid} item={item} />
        </Reorder.Item>
    );
}

function ValueRowActions({ uid, item }: { uid: string; item: RegItem; }) {
    const readValue = useSetAtom(doAsyncRegReadValueAtom);
    const writeValue = useSetAtom(doAsyncRegWriteValueAtom);
    const runnable = itemHasSubKey(item) && !!uid;
    const canDelete = (item.values?.length ?? 0) > 1;

    return (
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
    );
}

/** Formats DWORD/QWORD for the column radix only when unfocused, so typing stays stable. */
function NewValueInput({ uid, value }: { uid: string; value: RegValue; }) {
    const radix = useAtomValue(newValueRadixAtom);
    const hexPrefix = useAtomValue(newValueHexPrefixAtom);
    const hexPad = useAtomValue(newValueHexPadAtom);
    const [focused, setFocused] = useState(false);
    const [draft, setDraft] = useState<string | null>(null);
    const numeric = isNumericRegType(value.valueType);
    const display = () => formatRegNumericText(value.newValue, radix, hexPrefix, hexPad, value.valueType);
    const shown = numeric
        ? (focused && draft !== null ? draft : display())
        : value.newValue;

    function commitStored(text: string) {
        if (!numeric) {
            return;
        }
        const stored = toStoredRegNumericText(text, radix, hexPrefix);
        if (stored !== value.newValue) {
            patchSelectedValue(uid, (v) => { v.newValue = stored; });
        }
    }

    return (
        <Input
            className={cn(COL.newValue, "px-1.5 h-7 text-[0.72rem]", numeric && "font-mono")}
            value={shown}
            placeholder={numericPlaceholder(value.valueType, radix, hexPrefix, hexPad)}
            title={valueHint(value.valueType, radix, hexPrefix, hexPad)}
            aria-label="New value"
            onFocus={() => {
                if (!numeric) {
                    return;
                }
                setFocused(true);
                setDraft(display());
            }}
            onBlur={(e) => {
                if (!numeric) {
                    return;
                }
                commitStored(e.currentTarget.value);
                setDraft(null);
                setFocused(false);
            }}
            onChange={(e) => {
                const text = e.target.value;
                if (!numeric) {
                    patchSelectedValue(uid, (v) => { v.newValue = text; });
                    return;
                }
                setDraft(text);
                // Persist canonical form as soon as the text parses (always 0x in hex mode).
                patchSelectedValue(uid, (v) => { v.newValue = toStoredRegNumericText(text, radix, hexPrefix); });
            }}
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
    const hexPrefix = useAtomValue(currentValueHexPrefixAtom);
    const hexPad = useAtomValue(currentValueHexPadAtom);
    const { byUid } = useSnapshot(registryReadStore);
    const read: RegReadState | undefined = value.uid ? byUid[value.uid] : undefined;
    const { text, title, className } = currentValueLook(read, value, currentRadix, hexPrefix, hexPad);

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

function currentValueLook(
    read: RegReadState | undefined,
    value: RegValue,
    radix: RegNumericRadix,
    hexPrefix: RegHexPrefixMode,
    hexPad: RegHexPadMode,
): { text: string; title: string; className: string; } {
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
    const shown = isNumericRegType(value.valueType)
        ? formatRegNumericText(current, radix, hexPrefix, hexPad, value.valueType)
        : current;
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

function numericPlaceholder(type: RegValueType, radix: RegNumericRadix, hexPrefix: RegHexPrefixMode, hexPad: RegHexPadMode): string {
    if (!isNumericRegType(type)) {
        return VALUE_PLACEHOLDERS[type];
    }
    if (radix !== 16) {
        return "0";
    }
    const width = type === "REG_QWORD" ? 16 : 8;
    const lo = hexPad === "pad" ? "0".padStart(width, "0") : "0";
    const hi = "f".repeat(width);
    return hexPrefix === "none" ? `${lo} or ${hi}` : `0x${lo} or 0x${hi}`;
}

function valueHint(type: RegValueType, radix?: RegNumericRadix, hexPrefix?: RegHexPrefixMode, hexPad?: RegHexPadMode): string {
    switch (type) {
        case "REG_DWORD":
        case "REG_QWORD":
            if (radix === 16) {
                const parts = [
                    hexPrefix === "none" ? "without 0x (stored with a 0x prefix)" : "with a 0x prefix",
                    hexPad === "pad"
                        ? `zero-padded to ${type === "REG_QWORD" ? 16 : 8} digits`
                        : "unpadded",
                ];
                return `Hexadecimal ${parts.join(", ")}.`;
            }
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
