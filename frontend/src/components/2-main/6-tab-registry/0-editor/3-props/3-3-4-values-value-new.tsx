import { useState } from "react";
import { useAtomValue } from "jotai";
import { cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Input } from "@/ui/shadcn/input";
import { Textarea } from "@/ui/shadcn/textarea";
import { type RegValue, type RegValueType, VALUE_TYPE_LONG_LABELS } from "../../a-atoms/9-types-registry";
import { type RegHexPadMode, type RegHexPrefixMode, type RegNumericRadix, newValueHexPadAtom, newValueHexPrefixAtom, newValueRadixAtom } from "../../a-atoms/2-run-registry";
import { formatRegNumericText, isNumericRegType, toStoredRegNumericText } from "../../a-atoms/7-reg-file-format";
import { patchSelectedValue } from "../../a-atoms/use-selected-node";
import { COL } from "./3-3-3-values-header";

// New-value column: inline edit for simple types, Edit dialog for expandable / binary / multi-string.

/** Expandable / binary / multi-string values open a dialog so the table row stays compact. */
export function usesValueDialog(type: RegValueType): boolean {
    return type === "REG_EXPAND_SZ" || type === "REG_BINARY" || type === "REG_MULTI_SZ";
}

export function Column_NewValueCell({ uid, value }: { uid: string; value: RegValue; }) {
    return usesValueDialog(value.valueType)
        ? <Column_NewValueDialog uid={uid} value={value} />
        : <Column_NewValue uid={uid} value={value} />;
}

/** Compact new-value cell with a right-aligned Edit button and a Save/Cancel dialog. */
function Column_NewValueDialog({ uid, value }: { uid: string; value: RegValue; }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value.newValue);
    const preview = value.newValue.trim() ? value.newValue.replace(/\s+/g, " ") : "";

    function openDialog() {
        setDraft(value.newValue);
        setOpen(true);
    }

    function save() {
        if (draft !== value.newValue) {
            patchSelectedValue(uid, (v) => { v.newValue = draft; });
        }
        setOpen(false);
    }

    return (
        <>
            <div
                className={cn(COL.newValue, "pl-1.5 pr-0.5 h-7 border border-transparent rounded flex items-center gap-1")}
                title={valueHint(value.valueType)}
            >
                <span
                    className={cn(
                        "min-w-0 flex-1 truncate text-[0.72rem] font-mono",
                        preview ? "text-foreground" : "text-muted-foreground/60",
                    )}
                    aria-label="New value"
                >
                    {preview || VALUE_PLACEHOLDERS[value.valueType]}
                </span>
                <Button
                    className="px-1.5 h-5.5 shrink-0 font-normal"
                    variant="outline"
                    size="xs"
                    type="button"
                    title="Edit value in a dialog"
                    aria-label="Edit new value"
                    onClick={openDialog}
                >
                    Edit
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="p-0! max-w-xl! gap-0!" aria-describedby={NEW_VALUE_DIALOG_DESC_ID} modal>
                    <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                        <DialogTitle className="text-sm font-condensed font-normal">
                            Edit new value — {VALUE_TYPE_LONG_LABELS[value.valueType]}
                        </DialogTitle>
                        <DialogDescription id={NEW_VALUE_DIALOG_DESC_ID} className="sr-only">
                            Edit the registry value, then save or cancel.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-4 py-3">
                        <Textarea
                            className="min-h-40 max-h-[min(60vh,28rem)] font-mono text-xs resize-y"
                            value={draft}
                            placeholder={VALUE_PLACEHOLDERS[value.valueType]}
                            title={valueHint(value.valueType)}
                            aria-label="New value editor"
                            onChange={(e) => setDraft(e.target.value)}
                            {...turnOffAutoComplete}
                        />
                        <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
                            {valueHint(value.valueType)}
                        </p>
                    </div>

                    <DialogFooter className="m-0 px-4 pb-3 pt-2 flex-row justify-end! gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-w-16 font-condensed font-normal"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="min-w-16 font-condensed font-normal"
                            onClick={save}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

/** Formats DWORD/QWORD for the column radix only when unfocused, so typing stays stable. */
function Column_NewValue({ uid, value }: { uid: string; value: RegValue; }) {
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

/** Placeholder text showing the canonical form expected for each value type. */
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

const VALUE_PLACEHOLDERS: Record<RegValueType, string> = {
    REG_SZ: "Some text",
    REG_EXPAND_SZ: "%SystemRoot%\\System32",
    REG_DWORD: "0 or 0x0000ffff",
    REG_QWORD: "0 or 0x00000000ffffffff",
    REG_BINARY: "de,ad,be,ef",
    REG_MULTI_SZ: "One string per line",
};

const NEW_VALUE_DIALOG_DESC_ID = "reg-new-value-dialog-description";
