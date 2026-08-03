import { type ReactNode, useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { ExternalLink, Folder } from "lucide-react";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Button } from "@/ui/shadcn/button";
import { Textarea } from "@/ui/shadcn/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/field-comment";
import {
    type RegGroup,
    type RegItem,
    type RegSeparator,
    type RegValueType,
    type RegView,
    REG_VALUE_TYPES,
    VALUE_TYPE_LABELS,
    collectGroupItems,
    derivedItemLabel,
    formatItemKeyPath,
    fullKeyPath,
    hiveNeedsElevation,
    parseItemKeyPath,
} from "../a-atoms/9-types-registry";
import { patchSelectedGroup, patchSelectedItem, patchSelectedSeparator } from "../a-atoms/use-selected-node";
import { registryEditorStore } from "../a-atoms/0-registry-local-storage";
import {
    confirmRegistryWritesAtom,
    doAsyncRegJumpItemAtom,
    doAsyncRegReadAllAtom,
    doAsyncRegReadGroupAtom,
    doAsyncRegReadItemAtom,
    doAsyncRegWriteGroupAtom,
    doAsyncRegWriteItemAtom,
    readMatchesDesired,
    registryReadStore,
} from "../a-atoms/2-run-registry";
import { QuickAccessList } from "./3-2-quick-list";

export function PropsFor_Root() {
    const { config } = useSnapshot(registryEditorStore, { sync: true });
    const groups = config.groups as RegGroup[];
    const readAll = useSetAtom(doAsyncRegReadAllAtom);
    const hasItems = groups.some((group) => collectGroupItems(group).length > 0);

    return (<>
        <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground">
                Root of the registry operations tree. Add groups here, or drop a .reg or .json file onto the tree
                to import one as a new group. Groups and values can be reordered by drag-and-drop.
                This node cannot be moved or deleted.
            </p>
        </div>

        <Field_Comment
            value={config.comment ?? ""}
            onChange={(next) => applyComment(registryEditorStore.config, next)}
        />

        <div className="flex items-center gap-2">
            <RegActionButton label="Read all current values" disabled={!hasItems} onClick={() => void readAll()} />
            <ConfirmWritesToggle />
        </div>

        <QuickAccessList nodes={groups} />
    </>);
}

export function PropsFor_Group({ group }: { group: RegGroup; }) {
    const readGroup = useSetAtom(doAsyncRegReadGroupAtom);
    const writeGroup = useSetAtom(doAsyncRegWriteGroupAtom);
    const hasItems = collectGroupItems(group).length > 0;
    const uid = group.uid;

    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon kind="group" />
            <div className="flex items-center gap-2">
                <RegActionButton
                    label="Read group"
                    disabled={!hasItems || !uid}
                    title="Read the current value of every item in this group"
                    onClick={() => uid && void readGroup(uid)}
                />
                <RegActionButton
                    label="Write group"
                    disabled={!hasItems || !uid}
                    title="Write every value in this group (including nested groups) to the registry"
                    onClick={() => uid && void writeGroup(uid)}
                />
            </div>
        </div>

        <LabelAndField label="Group name">
            <Input
                className="h-7"
                value={group.name}
                onChange={(e) => patchSelectedGroup((g) => { g.name = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>

        <Field_Comment
            value={group.comment ?? ""}
            onChange={(next) => patchSelectedGroup((g) => applyComment(g, next))}
        />

        <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <FlagSwitch
                label="Require elevated privileges"
                hint="Prompt to relaunch as administrator before writing any value in this group."
                checked={!!group.requireElevated}
                onCheckedChange={(v) => patchSelectedGroup((g) => { g.requireElevated = v; })}
            />
        </div>

        <QuickAccessList nodes={[group]} />
    </>);
}

export function PropsFor_Separator({ separator }: { separator: RegSeparator; }) {
    return (<>
        <Field_TypeIcon kind="separator" />

        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the tree and in the quick actions list.
        </p>

        <Field_Comment
            value={separator.comment ?? ""}
            onChange={(next) => patchSelectedSeparator((s) => applyComment(s, next))}
        />
    </>);
}

export function PropsFor_Item({ item, group }: { item: RegItem; group: RegGroup; }) {
    const readItem = useSetAtom(doAsyncRegReadItemAtom);
    const writeItem = useSetAtom(doAsyncRegWriteItemAtom);
    const writeGroup = useSetAtom(doAsyncRegWriteGroupAtom);
    const jump = useSetAtom(doAsyncRegJumpItemAtom);

    const uid = item.uid;
    const hasKey = !!item.keyPath.trim();
    const parentHasItems = collectGroupItems(group).length > 0;

    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon kind="item" />
            <div className="flex items-center gap-2">
                <RegActionButton
                    label="Write parent group"
                    disabled={!parentHasItems || !group.uid}
                    title="Write every value in this item's parent group"
                    onClick={() => group.uid && void writeGroup(group.uid)}
                />
                <RegActionButton
                    label="Read current"
                    disabled={!hasKey || !uid}
                    title="Read this value from the registry"
                    onClick={() => uid && void readItem(uid)}
                />
                <RegActionButton
                    label="Write"
                    disabled={!hasKey || !uid}
                    title="Write the new value to the registry"
                    onClick={() => uid && void writeItem(uid)}
                />
            </div>
        </div>

        <Field_Comment
            value={item.comment ?? ""}
            onChange={(next) => patchSelectedItem((it) => applyComment(it, next))}
        />

        <Field_KeyPath item={item} onJump={() => uid && void jump(uid)} />

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <Field_ValueName item={item} />
            <Field_ValueType item={item} />
            <Field_View item={item} />
        </div>

        <Field_NewValue item={item} />

        <CurrentValuePanel item={item} />

        <div className="-mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <FlagSwitch
                label="Require elevated privileges"
                hint="Prompt to relaunch as administrator before writing this value. Machine-wide hives always require it."
                checked={!!item.requireElevated || hiveNeedsElevation(item.hive)}
                disabled={hiveNeedsElevation(item.hive)}
                onCheckedChange={(v) => patchSelectedItem((it) => { it.requireElevated = v; })}
            />
        </div>

        <Field_ItemName item={item} />
    </>);
}

// ---------------------------------------------------------------------------
// Item fields

function Field_KeyPath({ item, onJump }: { item: RegItem; onJump: () => void; }) {
    // Draft while focused so typing short hives / trailing separators is not
    // immediately rewritten to the canonical long form.
    const [draft, setDraft] = useState<string | null>(null);
    const display = draft ?? formatItemKeyPath(item);

    useEffect(() => {
        setDraft(null);
    }, [item.uid]);

    return (
        <LabelAndField
            label="Key path"
            labelHint="Hive plus subkey. Accepts HKCU or HKEY_CURRENT_USER; backslashes are shown singly."
        >
            <div className="w-full flex items-center gap-1">
                <Input
                    className="h-7 font-mono text-[0.72rem]"
                    value={display}
                    placeholder="HKEY_CURRENT_USER\SOFTWARE\Vendor\Product"
                    onFocus={() => setDraft(formatItemKeyPath(item))}
                    onChange={(e) => {
                        const text = e.target.value;
                        setDraft(text);
                        const parsed = parseItemKeyPath(text, item.hive);
                        patchSelectedItem((it) => {
                            it.hive = parsed.hive;
                            it.keyPath = parsed.keyPath;
                        });
                    }}
                    onBlur={() => setDraft(null)}
                    {...turnOffAutoComplete}
                />
                <Button
                    className="shrink-0 size-7"
                    variant="outline"
                    size="icon-xs"
                    type="button"
                    disabled={!item.keyPath.trim()}
                    title={`Open regedit at ${fullKeyPath(item)}`}
                    onClick={onJump}
                >
                    <ExternalLink className="size-3" />
                </Button>
            </div>
        </LabelAndField>
    );
}

function Field_ValueName({ item }: { item: RegItem; }) {
    return (
        <LabelAndField label="Value name">
            <Input
                className="h-7"
                value={item.valueName}
                placeholder="(Default)"
                onChange={(e) => patchSelectedItem((it) => { it.valueName = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

function Field_ValueType({ item }: { item: RegItem; }) {
    return (
        <LabelAndField label="Value type">
            <Select
                value={item.valueType}
                onValueChange={(v) => patchSelectedItem((it) => { it.valueType = v as RegValueType; })}
            >
                <SelectTrigger className="w-full h-7! min-w-40 text-[0.72rem]">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent>
                    {REG_VALUE_TYPES.map(
                        (type) => (
                            <SelectItem key={type} value={type}>
                                {VALUE_TYPE_LABELS[type]}
                            </SelectItem>
                        )
                    )}
                </SelectContent>
            </Select>
        </LabelAndField>
    );
}

function Field_View({ item }: { item: RegItem; }) {
    return (
        <LabelAndField label="Registry view" labelHint="Which of the 32-/64-bit registry views to use.">
            <Select
                value={item.view ?? "curr"}
                onValueChange={(v) => patchSelectedItem((it) => {
                    if (v === "curr") {
                        delete it.view;
                    } else {
                        it.view = v as RegView;
                    }
                })}
            >
                <SelectTrigger className="w-full h-7! min-w-24 text-[0.72rem]">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="curr">Default</SelectItem>
                    <SelectItem value="32">32-bit</SelectItem>
                    <SelectItem value="64">64-bit</SelectItem>
                </SelectContent>
            </Select>
        </LabelAndField>
    );
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

function Field_NewValue({ item }: { item: RegItem; }) {
    const multiline = item.valueType === "REG_MULTI_SZ" || item.valueType === "REG_BINARY";

    return (
        <LabelAndField label="New value" labelHint={valueHint(item.valueType)}>
            {multiline
                ? (
                    <Textarea
                        className="min-h-16 font-mono text-[0.72rem]"
                        value={item.newValue}
                        placeholder={VALUE_PLACEHOLDERS[item.valueType]}
                        onChange={(e) => patchSelectedItem((it) => { it.newValue = e.target.value; })}
                        {...turnOffAutoComplete}
                    />
                )
                : (
                    <Input
                        className="h-7"
                        value={item.newValue}
                        placeholder={VALUE_PLACEHOLDERS[item.valueType]}
                        onChange={(e) => patchSelectedItem((it) => { it.newValue = e.target.value; })}
                        {...turnOffAutoComplete}
                    />
                )
            }
        </LabelAndField>
    );
}

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

/** Last value read back from the machine for this item, with a match indicator. */
function CurrentValuePanel({ item }: { item: RegItem; }) {
    const { byUid } = useSnapshot(registryReadStore);
    const read = item.uid ? byUid[item.uid] : undefined;

    if (!read) {
        return (
            <div className="px-2 py-1.5 text-[0.65rem] text-muted-foreground bg-muted/50 border rounded">
                Current value not read yet. Use <span className="font-medium">Read current</span> to query the registry.
            </div>
        );
    }

    if (read.loading) {
        return (
            <div className="px-2 py-1.5 text-[0.65rem] text-muted-foreground bg-muted/50 border rounded">
                Reading…
            </div>
        );
    }

    if (read.error) {
        return (
            <div className="px-2 py-1.5 text-[0.65rem] text-destructive bg-destructive/10 border border-destructive/40 rounded">
                {read.error}
            </div>
        );
    }

    if (!read.exists) {
        return (
            <div className="px-2 py-1.5 text-[0.65rem] text-amber-700 dark:text-amber-500 bg-amber-500/10 border border-amber-500/40 rounded">
                Not present in the registry. Writing will create it.
            </div>
        );
    }

    const matches = readMatchesDesired(read, item);

    return (
        <div className="px-2 py-1.5 bg-muted/50 border rounded flex flex-col gap-1">
            <div className="text-[0.65rem] text-muted-foreground flex items-center justify-between gap-2">
                <span>Current value{read.valueType && read.valueType !== item.valueType ? ` (${read.valueType})` : ""}</span>
                <span
                    className={classNames(
                        "px-1.5 rounded-full border",
                        matches
                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/40"
                            : "text-orange-700 dark:text-orange-400 bg-orange-500/15 border-orange-500/40",
                    )}
                >
                    {matches ? "Matches" : "Differs"}
                </span>
            </div>
            <div className="max-h-24 overflow-auto font-mono text-[0.72rem] whitespace-pre-wrap break-all">
                {read.value || <span className="text-muted-foreground italic">(empty)</span>}
            </div>
        </div>
    );
}

function Field_ItemName({ item }: { item: RegItem; }) {
    const derived = derivedItemLabel(item);

    return (
        <LabelAndField label="Display name">
            <Input
                value={item.name ?? derived}
                onChange={(e) => {
                    const next = e.target.value;
                    patchSelectedItem((it) => {
                        if (next === derivedItemLabel(it)) {
                            delete it.name;
                        } else {
                            it.name = next;
                        }
                    });
                }}
                onBlur={() => {
                    if (!item.name?.trim()) {
                        patchSelectedItem((it) => { delete it.name; });
                    }
                }}
                placeholder={derived}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

// ---------------------------------------------------------------------------
// Shared UI

function ConfirmWritesToggle() {
    const [confirm, setConfirm] = useAtom(confirmRegistryWritesAtom);

    return (
        <FlagSwitch
            label="Confirm before writing"
            hint="Show a confirmation dialog before any registry write. Registry edits cannot be undone from here."
            checked={confirm}
            onCheckedChange={setConfirm}
        />
    );
}

function RegActionButton({ label, disabled, title, onClick }: { label: string; disabled: boolean; title?: string; onClick: () => void; }) {
    return (
        <Button
            className="font-normal text-sky-800 bg-sky-200 dark:text-sky-400 dark:bg-sky-800/40 dark:border-sky-700 hover:bg-sky-300/80 dark:hover:bg-sky-800/80 border-sky-500/60"
            variant="secondary"
            size="xs"
            disabled={disabled}
            title={title}
            onClick={onClick}
            type="button"
        >
            {label}
        </Button>
    );
}

function FlagSwitch({ label, hint, checked, disabled, onCheckedChange, }: { label: string; hint: string; checked: boolean; disabled?: boolean; onCheckedChange: (v: boolean) => void; }) {
    return (
        <Label
            className={classNames(
                "font-normal text-[0.65rem] text-muted-foreground flex items-center gap-1",
                disabled ? "opacity-70 cursor-default" : "cursor-pointer",
            )}
            title={hint}
        >
            <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onCheckedChange(v === true)} />
            <span className="mt-0.5">{label}</span>
        </Label>
    );
}

function LabelAndField({ label, labelHint, children }: { label: string; labelHint?: string; children: ReactNode; }) {
    // Keep Label and Input as siblings — Label's select-none must not wrap the input
    // or caret placement breaks when typing at the start of the value.
    return (
        <Label className="text-xs font-normal whitespace-nowrap flex flex-col items-start gap-0.5">
            <div className="text-[0.65rem] text-muted-foreground whitespace-nowrap" title={labelHint}>
                {label}
            </div>
            {children}
        </Label>
    );
}

const typeIconLabelClasses = "text-[0.65rem] font-normal text-foreground/70 select-none";

function Field_TypeIcon({ kind }: { kind: "group" | "item" | "separator"; }) {
    const label = kind === "group" ? "Group" : kind === "separator" ? "Separator" : "Registry value";

    return (
        <div className={classNames(typeIconLabelClasses, "px-2 py-1 w-fit bg-muted border rounded inline-flex items-center gap-1")}>
            {kind === "group"
                ? <Folder className="shrink-0 size-3.5 text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900" />
                : kind === "item"
                    ? <SymbolAppRegedit className="shrink-0 size-3.5 opacity-70" />
                    : null
            }
            {label}
        </div>
    );
}
