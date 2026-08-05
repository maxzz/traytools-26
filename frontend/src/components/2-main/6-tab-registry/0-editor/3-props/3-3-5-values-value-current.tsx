import { useState } from "react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Textarea } from "@/ui/shadcn/textarea";
import { notice } from "@/ui/local-ui/7-toaster";
import { type RegValue, VALUE_TYPE_LONG_LABELS } from "../../a-atoms/9-types-registry";
import {
    type RegHexPadMode, type RegHexPrefixMode, type RegNumericRadix, type RegReadState,
    currentValueHexPadAtom, currentValueHexPrefixAtom, currentValueRadixAtom, readMatchesDesired, registryReadStore
} from "../../a-atoms/2-run-registry";
import { formatRegNumericText, isNumericRegType } from "../../a-atoms/7-reg-file-format";
import { COL } from "./3-3-3-values-header";
import { usesValueDialog } from "./3-3-4-values-value-new";

// Current-value column: read-back display with a View dialog for expandable / binary / multi-string.

/** Last value read back from the machine for this row, with a match indicator. */
export function Column_CurrentValue({ value }: { value: RegValue; }) {
    const [open, setOpen] = useState(false);
    const currentRadix = useAtomValue(currentValueRadixAtom);
    const hexPrefix = useAtomValue(currentValueHexPrefixAtom);
    const hexPad = useAtomValue(currentValueHexPadAtom);
    const { byUid } = useSnapshot(registryReadStore);
    const read: RegReadState | undefined = value.uid ? byUid[value.uid] : undefined;
    const { text, title, className } = currentValueLook(read, value, currentRadix, hexPrefix, hexPad);
    const dialogValue = usesValueDialog(value.valueType);
    const fullValue = read?.exists ? (read.value ?? "") : "";
    const canView = dialogValue && read?.exists === true && !read.loading && !read.error;
    const cellText = canView ? text.replace(/\s+/g, " ") : text;

    function copyValue() {
        void navigator.clipboard.writeText(fullValue).catch((e) => {
            notice.error(`Failed to copy value:<br/>${String(e)}`);
        });
    }

    return (<>
        <div
            className={cn(
                COL.current,
                "w-full pl-1.5 pr-0.5 h-7 text-[0.72rem] bg-muted/40 border border-transparent rounded flex items-center gap-1",
            )}
            title={title}
            aria-label={`Current value — ${title.replace(/\n/g, ". ")}`}
        >
            <span className={cn("min-w-0 flex-1 truncate", className, isNumericRegType(value.valueType) && read?.exists && "font-mono")}>
                {cellText}
            </span>
            {canView && (
                <Button
                    className="px-1.5 h-5.5 shrink-0 font-normal"
                    variant="outline"
                    size="xs"
                    type="button"
                    title="View current value in a dialog"
                    aria-label="View current value"
                    onClick={() => setOpen(true)}
                >
                    View
                </Button>
            )}
        </div>

        {canView && (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="p-0! max-w-xl! gap-0!" aria-describedby={CURRENT_VALUE_DIALOG_DESC_ID} modal>
                    <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                        <DialogTitle className="text-sm font-condensed font-normal">
                            Current value — {VALUE_TYPE_LONG_LABELS[value.valueType]}
                        </DialogTitle>
                        <DialogDescription id={CURRENT_VALUE_DIALOG_DESC_ID} className="sr-only">
                            Read-only registry value. Copy it or close the dialog.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-4 py-3">
                        <Textarea
                            className="min-h-40 max-h-[min(60vh,28rem)] font-mono text-xs resize-y"
                            value={fullValue}
                            readOnly
                            aria-label="Current value"
                            {...turnOffAutoComplete}
                        />
                    </div>

                    <DialogFooter className="m-0 px-4 pb-3 pt-2 flex-row justify-end! gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-w-16 font-condensed font-normal"
                            onClick={copyValue}
                        >
                            Copy
                        </Button>
                        <Button
                            type="button"
                            className="min-w-16 font-condensed font-normal"
                            onClick={() => setOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
    </>);
}

function currentValueLook(read: RegReadState | undefined, value: RegValue, radix: RegNumericRadix, hexPrefix: RegHexPrefixMode, hexPad: RegHexPadMode,): { text: string; title: string; className: string; } {
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
    const shown = isNumericRegType(value.valueType) ? formatRegNumericText(current, radix, hexPrefix, hexPad, value.valueType) : current;
    const typeNote = read.valueType && read.valueType !== value.valueType ? `\nOn machine: ${read.valueType}` : "";

    return {
        text: shown || "(empty)",
        title: `${matches ? "Matches the new value" : "Differs from the new value"}\n${shown}${typeNote}`,
        className: matches
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-orange-700 dark:text-orange-400",
    };
}

const CURRENT_VALUE_DIALOG_DESC_ID = "reg-current-value-dialog-description";
