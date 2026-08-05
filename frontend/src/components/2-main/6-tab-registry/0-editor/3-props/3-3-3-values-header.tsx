import { useAtom } from "jotai";
import { classNames } from "@/utils/classnames";
import { labelClasses } from "@/components/2-main/a-shared/props-field-ui";
import { type RegHexPadMode, type RegHexPrefixMode, currentValueHexPadAtom, currentValueHexPrefixAtom, currentValueRadixAtom, newValueHexPadAtom, newValueHexPrefixAtom, newValueRadixAtom } from "../../a-atoms/2-run-registry";

export function HeaderRow() {
    return (
        <div className={classNames(labelClasses, "px-1 py-0.5 bg-muted/50 border-b rounded-t flex items-center gap-1")}>
            <span className={COL.handle} />
            <span className={COL.name}>Value name</span>
            <span className={COL.type}>Type</span>
            <Column_Value className={COL.newValue} label="New value" newOrCurrent />
            <Column_Value className={COL.current} label="Current" />
            <span className={COL.actions} />
        </div>
    );
}

/** Column widths shared by the header and the value rows. */
export const COL = {
    handle: "w-4 shrink-0",
    name: "flex-1 min-w-16",
    type: "w-22 shrink-0",
    newValue: "flex-[1.3] min-w-16",
    current: "flex-1 min-w-16",
    actions: "w-[4.75rem] shrink-0",
};

/** Column title on the left; the three format toggles stay right-aligned in the column. */
function Column_Value({ className, label, newOrCurrent }: { className: string; label: string; newOrCurrent?: boolean; }) {
    return (
        <span className={classNames(className, "min-w-0 flex items-center gap-0.5")}>
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
    return (
        <button
            type="button"
            className={headerToggleClasses}
            title={radix === 10
                ? `${column}: decimal — click for hexadecimal`
                : `${column}: hexadecimal — click for decimal`}
            aria-label={`${column} numeric base ${radix}, switch to ${next}`}
            onClick={() => setRadix(next)}
        >
            {radix}
        </button>
    );
}

const headerToggleClasses =
    "px-0.5 h-3 min-w-3 text-[0.58rem] leading-none font-medium tabular-nums text-muted-foreground hover:text-foreground border border-border/70 rounded-sm disabled:opacity-40 disabled:pointer-events-none";

/** Tiny 0x ↔ -- toggle: whether hex is shown/typed with a 0x prefix. */
function HexPrefixToggle({ newOrCurrent }: { newOrCurrent?: boolean; }) {
    const [radix] = useAtom(newOrCurrent ? newValueRadixAtom : currentValueRadixAtom);
    const [mode, setMode] = useAtom(newOrCurrent ? newValueHexPrefixAtom : currentValueHexPrefixAtom);
    const next: RegHexPrefixMode = mode === "0x" ? "none" : "0x";
    const label = mode === "0x" ? "0x" : "--";
    const column = newOrCurrent ? "New value" : "Current";
    return (
        <button
            type="button"
            className={headerToggleClasses}
            disabled={radix === 10}
            title={mode === "0x"
                ? `${column}: hex shows 0x — click to hide the prefix`
                : `${column}: hex without 0x — click to show the prefix`}
            aria-label={`${column} hex prefix ${label}, switch to ${next === "0x" ? "0x" : "none"}`}
            onClick={() => setMode(next)}
        >
            {label}
        </button>
    );
}

/** Tiny 00 ↔ -- toggle: zero-pad hex to DWORD (8) / QWORD (16) width. */
function HexPadToggle({ newOrCurrent }: { newOrCurrent?: boolean; }) {
    const [radix] = useAtom(newOrCurrent ? newValueRadixAtom : currentValueRadixAtom);
    const [mode, setMode] = useAtom(newOrCurrent ? newValueHexPadAtom : currentValueHexPadAtom);
    const next: RegHexPadMode = mode === "pad" ? "none" : "pad";
    const label = mode === "pad" ? "00" : "--";
    const column = newOrCurrent ? "New value" : "Current";
    return (
        <button
            type="button"
            className={headerToggleClasses}
            disabled={radix === 10}
            title={mode === "pad"
                ? `${column}: hex zero-padded — click for unpadded`
                : `${column}: hex unpadded — click to pad to type width`}
            aria-label={`${column} hex padding ${label}, switch to ${next === "pad" ? "00" : "none"}`}
            onClick={() => setMode(next)}
        >
            {label}
        </button>
    );
}
