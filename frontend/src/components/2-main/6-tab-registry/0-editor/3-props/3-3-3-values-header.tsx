import { type ComponentProps } from "react";
import { useAtom, useSetAtom } from "jotai";
import { classNames } from "@/utils/classnames";
import { ArrowDownToLine, PencilLine } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { labelClasses } from "@/components/2-main/a-shared/props-field-ui";
import { type RegItem, itemHasSubKey } from "../../a-atoms/9-types-registry";
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
} from "../../a-atoms/2-run-registry";

/**
 * Parent grid for the values table: name | type | new value | current | actions.
 * Header and each body row use {@link SUBGRID_ROW} so they share these tracks.
 */
export const TABLE_GRID =
    "grid grid-cols-[minmax(0,1.1fr)_5.5rem_minmax(0,1.3fr)_minmax(0,1fr)_6.5rem] gap-x-1 px-1";

/** One table row that inherits the parent column tracks via CSS subgrid. */
export const SUBGRID_ROW = "col-span-full grid grid-cols-subgrid";

/** Per-cell helpers (widths come from the parent grid, not from these classes). */
export const COL = {
    handle: "w-4 shrink-0",
    name: "min-w-0",
    type: "min-w-0",
    newValue: "min-w-0",
    current: "min-w-0",
    actions: "min-w-0",
};

export function HeaderRow({ item }: { item: RegItem; }) {
    return (
        <div className={classNames(labelClasses, SUBGRID_ROW, "py-0.5 bg-muted/50 border-b rounded-t items-center")}>
            <span className={COL.name}>Value name</span>
            <span className={COL.type}>Type</span>
            <Column_Value className={COL.newValue} label="New value" newOrCurrent />
            <Column_Value className={COL.current} label="Current" />
            <Column_HeaderActions item={item} />
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
function Column_HeaderActions({ item }: { item: RegItem; }) {
    const readItem = useSetAtom(doAsyncRegReadItemAtom);
    const writeItem = useSetAtom(doAsyncRegWriteItemAtom);
    const uid = item.uid;
    const runnable = itemHasSubKey(item) && !!uid;

    return (
        <div className={classNames(COL.actions, "h-5 flex items-center justify-end gap-0.5")}>
            <span className={COL.handle} aria-hidden />
            <span className="mr-2 size-6" aria-hidden />
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
