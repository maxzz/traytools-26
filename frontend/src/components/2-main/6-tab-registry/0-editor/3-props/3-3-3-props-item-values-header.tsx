import { useAtom } from "jotai";
import { cn } from "@/utils/classnames";
import { labelClasses } from "@/components/2-main/a-shared/props-field-ui";
import {
    type RegHexPadMode,
    type RegHexPrefixMode,
    type RegNumericRadix,
    currentValueHexPadAtom,
    currentValueHexPrefixAtom,
    currentValueRadixAtom,
    newValueHexPadAtom,
    newValueHexPrefixAtom,
    newValueRadixAtom,
} from "../../a-atoms/2-run-registry";

/** Column widths shared by the header and the value rows. */
export const COL = {
    handle: "w-4 shrink-0",
    name: "flex-1 min-w-16",
    type: "w-22 shrink-0",
    newValue: "flex-[1.3] min-w-16",
    current: "flex-1 min-w-16",
    actions: "w-[4.75rem] shrink-0",
};

export function HeaderRow() {
    const [newRadix, setNewRadix] = useAtom(newValueRadixAtom);
    const [currentRadix, setCurrentRadix] = useAtom(currentValueRadixAtom);
    const [newHexPrefix, setNewHexPrefix] = useAtom(newValueHexPrefixAtom);
    const [currentHexPrefix, setCurrentHexPrefix] = useAtom(currentValueHexPrefixAtom);
    const [newHexPad, setNewHexPad] = useAtom(newValueHexPadAtom);
    const [currentHexPad, setCurrentHexPad] = useAtom(currentValueHexPadAtom);

    return (
        <div className={cn(labelClasses, "px-1 py-0.5 bg-muted/50 border-b rounded-t flex items-center gap-1")}>
            <span className={COL.handle} />
            <span className={COL.name}>Value name</span>
            <span className={COL.type}>Type</span>
            <ValueColumnHeader
                className={COL.newValue}
                label="New value"
                radix={newRadix}
                onRadixChange={setNewRadix}
                hexPrefix={newHexPrefix}
                onHexPrefixChange={setNewHexPrefix}
                hexPad={newHexPad}
                onHexPadChange={setNewHexPad}
            />
            <ValueColumnHeader
                className={COL.current}
                label="Current"
                radix={currentRadix}
                onRadixChange={setCurrentRadix}
                hexPrefix={currentHexPrefix}
                onHexPrefixChange={setCurrentHexPrefix}
                hexPad={currentHexPad}
                onHexPadChange={setCurrentHexPad}
            />
            <span className={COL.actions} />
        </div>
    );
}

/** Column title on the left; the three format toggles stay right-aligned in the column. */
function ValueColumnHeader({
    className,
    label,
    radix,
    onRadixChange,
    hexPrefix,
    onHexPrefixChange,
    hexPad,
    onHexPadChange,
}: {
    className: string;
    label: string;
    radix: RegNumericRadix;
    onRadixChange: (next: RegNumericRadix) => void;
    hexPrefix: RegHexPrefixMode;
    onHexPrefixChange: (next: RegHexPrefixMode) => void;
    hexPad: RegHexPadMode;
    onHexPadChange: (next: RegHexPadMode) => void;
}) {
    const hexOff = radix === 10;
    return (
        <span className={cn(className, "min-w-0 flex items-center gap-0.5")}>
            <span className="truncate">{label}</span>
            <span className="ml-auto inline-flex items-center gap-0.5 shrink-0">
                <RadixToggle radix={radix} onRadixChange={onRadixChange} column={label} />
                <HexPrefixToggle mode={hexPrefix} onModeChange={onHexPrefixChange} disabled={hexOff} column={label} />
                <HexPadToggle mode={hexPad} onModeChange={onHexPadChange} disabled={hexOff} column={label} />
            </span>
        </span>
    );
}

/** Tiny 10 ↔ 16 toggle; stays inside the existing header row height. */
function RadixToggle({ radix, onRadixChange, column }: { radix: RegNumericRadix; onRadixChange: (next: RegNumericRadix) => void; column: string; }) {
    const next = radix === 10 ? 16 : 10;
    return (
        <button
            type="button"
            className={headerToggleClasses}
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

const headerToggleClasses =
    "px-0.5 h-3 min-w-3 text-[0.58rem] leading-none font-medium tabular-nums text-muted-foreground hover:text-foreground border border-border/70 rounded-sm disabled:opacity-40 disabled:pointer-events-none";

/** Tiny 0x ↔ -- toggle: whether hex is shown/typed with a 0x prefix. */
function HexPrefixToggle({ mode, onModeChange, disabled, column }: {
    mode: RegHexPrefixMode;
    onModeChange: (next: RegHexPrefixMode) => void;
    disabled?: boolean;
    column: string;
}) {
    const next: RegHexPrefixMode = mode === "0x" ? "none" : "0x";
    const label = mode === "0x" ? "0x" : "--";
    return (
        <button
            type="button"
            className={headerToggleClasses}
            disabled={disabled}
            title={mode === "0x"
                ? `${column}: hex shows 0x — click to hide the prefix`
                : `${column}: hex without 0x — click to show the prefix`}
            aria-label={`${column} hex prefix ${label}, switch to ${next === "0x" ? "0x" : "none"}`}
            onClick={() => onModeChange(next)}
        >
            {label}
        </button>
    );
}

/** Tiny 00 ↔ -- toggle: zero-pad hex to DWORD (8) / QWORD (16) width. */
function HexPadToggle({ mode, onModeChange, disabled, column }: {
    mode: RegHexPadMode;
    onModeChange: (next: RegHexPadMode) => void;
    disabled?: boolean;
    column: string;
}) {
    const next: RegHexPadMode = mode === "pad" ? "none" : "pad";
    const label = mode === "pad" ? "00" : "--";
    return (
        <button
            type="button"
            className={headerToggleClasses}
            disabled={disabled}
            title={mode === "pad"
                ? `${column}: hex zero-padded — click for unpadded`
                : `${column}: hex unpadded — click to pad to type width`}
            aria-label={`${column} hex padding ${label}, switch to ${next === "pad" ? "00" : "none"}`}
            onClick={() => onModeChange(next)}
        >
            {label}
        </button>
    );
}
