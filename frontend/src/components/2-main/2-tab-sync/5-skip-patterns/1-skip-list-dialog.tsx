import { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { ScrollArea2 } from "@/ui/shadcn/scroll-area";
import { ComboMruInput, COMBO_MRU, isComboMruPopupTarget } from "@/components/2-main/2-tab-sync/5-skip-patterns/combo-mru";
import { skipPatternDisplayLabel, skipPatternError } from "./b-1-skip-patterns";
import {
    addSkipListRow,
    applySkipListDialog,
    closeSkipListDialog,
    removeSkipListRow,
    resetSkipListRowsToDefault,
    setSkipListRowPattern,
    skipListDialogAtom,
    skipListHasInvalidAtom,
} from "./a-skip-list-atoms";

export function SkipListDialog() {
    const [payload, setPayload] = useAtom(skipListDialogAtom);
    const hasInvalid = useAtomValue(skipListHasInvalidAtom);
    const [focusRowId, setFocusRowId] = useState<string | null>(null);
    const open = payload != null;

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next) { setPayload(null); setFocusRowId(null); } }}>
            <DialogContent
                className="p-0! max-w-sm! gap-0!"
                aria-describedby={DESCRIPTION_ID}
                onPointerDownOutside={(e) => {
                    if (isComboMruPopupTarget(e.target)) {
                        e.preventDefault();
                    }
                }}
                onFocusOutside={(e) => {
                    if (isComboMruPopupTarget(e.target)) {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm font-condensed font-normal select-none">
                        Skip list
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Regular expressions for files and folders to skip during Check and Sync.
                    </DialogDescription>
                </DialogHeader>

                <p id={DESCRIPTION_ID} className="px-4 pt-3 text-[0.65rem] text-muted-foreground leading-4">
                    Each pattern is a regular expression, matched without case against the file or folder
                    name and its path relative to the pair root (use <span className="font-mono text-foreground">/</span> in paths).
                    A matching folder is not entered; matching destination files are left untouched.
                    An empty list skips nothing.
                </p>

                <ScrollArea2 className="max-h-[min(60vh,24rem)]">
                    <div className="px-4 py-3">
                        {payload && payload.rows.length === 0 && (
                            <div className="py-4 text-xs">
                                If no exclusion patterns are specified, Check and Synch operations will include all files and folders.
                            </div>
                        )}

                        {payload && (
                            <div className="flex flex-col gap-1">
                                {payload.rows.map(
                                    (row, index) => (
                                        <SkipPatternRow key={row.id} id={row.id} index={index} pattern={row.pattern} autoFocus={row.id === focusRowId} />
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea2>

                <div className="px-4 pb-2 flex items-center gap-1.5">
                    <Button type="button" variant="outline" size="xs" onClick={() => { const id = addSkipListRow(); if (id) setFocusRowId(id); }}>
                        <Plus className="size-3" />
                        Add pattern
                    </Button>
                    <Button
                        type="button" variant="ghost" size="xs" onClick={() => resetSkipListRowsToDefault()} title="Restore .git and node_modules">
                        <RotateCcw className="size-3" />
                        Defaults
                    </Button>
                </div>

                <DialogFooter className="m-0 px-4 pb-3 pt-2 flex justify-end! gap-2">
                    <Button
                        className="min-w-16 font-condensed font-normal" variant="outline" onClick={() => closeSkipListDialog()} type="button">
                        Cancel
                    </Button>
                    <Button className="min-w-16 font-condensed font-normal" disabled={hasInvalid} onClick={() => applySkipListDialog()} type="button">
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SkipPatternRow({ id, index, pattern, autoFocus }: { id: string; index: number; pattern: string; autoFocus?: boolean; }) {
    const error = skipPatternError(pattern);

    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-start gap-1">
                <ComboMruInput
                    listId={COMBO_MRU.skipPatterns}
                    instanceId={id}
                    value={pattern}
                    autoFocus={autoFocus}
                    aria-label={`Skip pattern ${index + 1}`}
                    aria-invalid={error ? true : undefined}
                    recentLabel="Recent patterns"
                    emptyLabel="No recent patterns"
                    itemLabel={skipPatternDisplayLabel}
                    canRemember={(next) => skipPatternError(next) == null}
                    onValueChange={(next) => setSkipListRowPattern(id, next)}
                />

                <Button
                    className="mt-0.5 size-6 text-muted-foreground hover:text-destructive"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeSkipListRow(id)}
                    title="Remove pattern"
                    aria-label={`Remove skip pattern ${index + 1}`}
                    type="button"
                >
                    <Trash2 className="size-3 stroke-1.5" />
                </Button>
            </div>

            {error && (
                <div className="pr-7 text-[0.65rem] text-destructive leading-4">
                    {error}
                </div>
            )}
        </div>
    );
}

const DESCRIPTION_ID = "sync-skip-list-dialog-description";
