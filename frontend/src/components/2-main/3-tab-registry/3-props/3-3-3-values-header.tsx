import { type ComponentProps } from "react";
import { useAtom, useSetAtom } from "jotai";
import { classNames } from "@/utils/classnames";
import { ArrowDownToLine, PencilLine } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { labelClasses } from "@/components/2-main/a-shared/props-1-shared-controls";
import { type RegItem, itemHasSubKey } from "../a-atoms/9-types-registry";
import {
    type RegHexPadMode,
    type RegHexPrefixMode,
    currentValueHexPadAtom,
    currentValueHexPrefixAtom,
    currentValueRadixAtom,
    doAsyncRegReadItemAtom,
    doAsyncRegWriteItemAtom,
    newValueHexPadAtom,
    newValueHexPrefixAtom,
    newValueRadixAtom,
} from "../a-atoms/2-run-registry";

/**
 * Parent grid for the values table: name | type | new value | current | actions.
 * Header and each body row use {@link SUBGRID_ROW_Classes} so they share these tracks.
 * Actions track widens when Edit order shows drag + delete controls.
 */
export function tableGridClasses(editOrder: boolean): string {
    return editOrder
        ? "grid grid-cols-[minmax(0,1.2fr)_70px_minmax(0,1.3fr)_minmax(0,1.3fr)_6.5rem]"
        : "grid grid-cols-[minmax(0,1.2fr)_70px_minmax(0,1.3fr)_minmax(0,1.3fr)_3.25rem]";
}

/** One table row that inherits the parent column tracks via CSS subgrid. */
export const SUBGRID_ROW_Classes = "col-span-full grid grid-cols-subgrid";

/**
 * Flat controls in the first four columns: no box chrome; a single right edge
 * separates columns. Focus uses an inset CSS outline (not ring).
 */
export const TABLE_CELL_CONTROL_Classes = "\
rounded-none border-0 border-r border-border \
bg-transparent shadow-none dark:bg-transparent \
\
focus-visible:border-border \
focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 \
focus-visible:outline-solid focus-visible:outline-1 focus-visible:outline-ring \
focus-visible:-outline-offset-1";

/** Per-cell helpers (widths come from the parent grid, not from these classes). */
export const COL_Classes = {
    handle: "w-4 shrink-0",
    name: "pl-1.25 min-w-0 border-r border-border",
    type: "pl-1.25 min-w-0 border-r border-border",
    newValue: "pl-1.25 min-w-0 border-r border-border",
    current: "pl-1.25 min-w-0 border-r border-border",
    actions: "min-w-0",
};

export function TableHeaderRow({ item, editOrder }: { item: RegItem; editOrder: boolean; }) {
    return (
        <div className={classNames(labelClasses, SUBGRID_ROW_Classes, "py-0.5 bg-muted/50 border-b rounded-t items-center")}>
            <span className={COL_Classes.name}>Value name</span>
            <span className={COL_Classes.type}>Type</span>
            <Column_Value className={COL_Classes.newValue} label="New value" newOrCurrent />
            <Column_Value className={COL_Classes.current} label="Current" />
            <Column_HeaderActions item={item} editOrder={editOrder} />
        </div>
    );
}

/** Column title on the left; the three format toggles stay right-aligned in the column. */
function Column_Value({ className, label, newOrCurrent }: { className: string; label: string; newOrCurrent?: boolean; }) {
    return (
        <span className={classNames(className, "flex items-center gap-0.5")}>
            <span className="truncate">{label}</span>
            <span className="ml-auto inline-flex items-center gap-0.5 shrink-0">
                <RadixToggle newOrCurrent={newOrCurrent} />
                <HexPrefixToggle newOrCurrent={newOrCurrent} />
                <HexPadToggle newOrCurrent={newOrCurrent} />
            </span>
        </span>
    );
}

/** Tiny 10 ↔ 16 toggle; stays inside the existing header row height. */
function RadixToggle({ newOrCurrent }: { newOrCurrent?: boolean; }) {
    const [radix, setRadix] = useAtom(newOrCurrent ? newValueRadixAtom : currentValueRadixAtom);
    const next = radix === 10 ? 16 : 10;
    const column = newOrCurrent ? "New value" : "Current";
    const title = radix === 10 ? `${column}: decimal — click for hexadecimal` : `${column}: hexadecimal — click for decimal`;
    const ariaLabel = `${column} numeric base ${radix}, switch to ${next}`;
    return (
        <HeaderToggleButton title={title} aria-label={ariaLabel} onClick={() => setRadix(next)}>
            {radix}
        </HeaderToggleButton>
    );
}

/** Tiny 0x ↔ -- toggle: whether hex is shown/typed with a 0x prefix. */
function HexPrefixToggle({ newOrCurrent }: { newOrCurrent?: boolean; }) {
    const [radix] = useAtom(newOrCurrent ? newValueRadixAtom : currentValueRadixAtom);
    const [mode, setMode] = useAtom(newOrCurrent ? newValueHexPrefixAtom : currentValueHexPrefixAtom);
    const label = mode === "0x" ? "0x" : "--";
    const next: RegHexPrefixMode = mode === "0x" ? "none" : "0x";
    const column = newOrCurrent ? "New value" : "Current";
    const title = mode === "0x" ? `${column}: hex shows 0x — click to hide the prefix` : `${column}: hex without 0x — click to show the prefix`;
    const ariaLabel = `${column} hex prefix ${label}, switch to ${next === "0x" ? "0x" : "none"}`;
    return (
        <HeaderToggleButton disabled={radix === 10} title={title} aria-label={ariaLabel} onClick={() => setMode(next)}>
            {label}
        </HeaderToggleButton>
    );
}

/** Tiny 00 ↔ -- toggle: zero-pad hex to DWORD (8) / QWORD (16) width. */
function HexPadToggle({ newOrCurrent }: { newOrCurrent?: boolean; }) {
    const [radix] = useAtom(newOrCurrent ? newValueRadixAtom : currentValueRadixAtom);
    const [mode, setMode] = useAtom(newOrCurrent ? newValueHexPadAtom : currentValueHexPadAtom);
    const label = mode === "pad" ? "00" : "--";
    const next: RegHexPadMode = mode === "pad" ? "none" : "pad";
    const column = newOrCurrent ? "New value" : "Current";
    const title = mode === "pad" ? `${column}: hex zero-padded — click for unpadded` : `${column}: hex unpadded — click to pad to type width`;
    const ariaLabel = `${column} hex padding ${label}, switch to ${next === "pad" ? "00" : "none"}`;
    return (
        <HeaderToggleButton disabled={radix === 10} title={title} aria-label={ariaLabel} onClick={() => setMode(next)}>
            {label}
        </HeaderToggleButton>
    );
}

/** Shared look for the tiny header format toggles. */
function HeaderToggleButton({ className, ...rest }: ComponentProps<"button">) {
    return (
        <button className={classNames(headerToggleClasses, className)} type="button" {...rest} />
    );
}

const headerToggleClasses = "px-0.5 h-3 min-w-3 text-[0.58rem] leading-none font-medium tabular-nums text-muted-foreground hover:text-foreground border border-border/70 rounded-sm disabled:opacity-40 disabled:pointer-events-none";

/** Read / write every value in the table; aligned over the per-row action icons. */
function Column_HeaderActions({ item, editOrder }: { item: RegItem; editOrder: boolean; }) {
    const readItem = useSetAtom(doAsyncRegReadItemAtom);
    const writeItem = useSetAtom(doAsyncRegWriteItemAtom);
    const uid = item.uid;
    const runnable = itemHasSubKey(item) && !!uid;

    return (
        <div className={classNames(COL_Classes.actions, "h-5 flex items-center justify-end gap-0.5")}>
            {editOrder && (
                <>
                    <span className={COL_Classes.handle} aria-hidden />
                    <span className="mr-2 size-6" aria-hidden />
                </>
            )}
            <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                className="size-6"
                disabled={!runnable}
                title={runnable ? "Read every value of this key from the registry" : "Set a key path first"}
                aria-label="Read all values"
                onClick={() => uid && void readItem(uid)}
            >
                <ArrowDownToLine className="size-3" />
            </Button>
            <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                className="size-6"
                disabled={!runnable}
                title={runnable ? "Write every value of this key to the registry" : "Set a key path first"}
                aria-label="Write all values"
                onClick={() => uid && void writeItem(uid)}
            >
                <PencilLine className="size-3" />
            </Button>
        </div>
    );
}
