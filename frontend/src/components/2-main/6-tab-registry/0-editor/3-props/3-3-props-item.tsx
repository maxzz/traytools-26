import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { useDebouncedValue } from "@/utils/util-hooks";
import { Copy, SquareArrowOutUpRight, X } from "lucide-react";
import { Input } from "@/ui/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { Textarea } from "@/ui/shadcn/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { notice } from "@/ui/local-ui/7-toaster";
import { Field_Comment, applyComment } from "@/components/2-main/a-shared/field-comment";
import {
    Field_TypeIcon,
    FlagSwitch,
    LabelAndField,
    PropsActionButton,
    typeBadgeIcons,
} from "@/components/2-main/a-shared/props-field-ui";
import {
    type RegGroup,
    type RegItem,
    type RegValueType,
    type RegView,
    REG_VALUE_TYPES,
    VALUE_TYPE_LABELS,
    collectGroupItems,
    derivedItemLabel,
    fullKeyPath,
    hiveNeedsElevation,
    itemHasSubKey,
    itemHive,
    validateItemKeyPath,
} from "../../a-atoms/9-types-registry";
import { registryEditorStore } from "../../a-atoms/0-registry-local-storage";
import { patchSelectedItem } from "../../a-atoms/use-selected-node";
import {
    doAsyncRegJumpItemAtom,
    doAsyncRegReadItemAtom,
    doAsyncRegWriteGroupAtom,
    doAsyncRegWriteItemAtom,
    readMatchesDesired,
    registryReadStore,
} from "../../a-atoms/2-run-registry";

export function PropsFor_Item({ item, group }: { item: RegItem; group: RegGroup; }) {
    const readItem = useSetAtom(doAsyncRegReadItemAtom);
    const writeItem = useSetAtom(doAsyncRegWriteItemAtom);
    const writeGroup = useSetAtom(doAsyncRegWriteGroupAtom);
    const jump = useSetAtom(doAsyncRegJumpItemAtom);

    const uid = item.uid;
    const hasKey = itemHasSubKey(item);
    const parentHasItems = collectGroupItems(group).length > 0;
    const hive = itemHive(item);

    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon label="Registry value" icon={typeBadgeIcons.registry} />
            <div className="flex items-center gap-2">
                <PropsActionButton
                    label="Write parent group"
                    disabled={!parentHasItems || !group.uid}
                    title="Write every value in this item's parent group"
                    onClick={() => group.uid && void writeGroup(group.uid)}
                />
                <PropsActionButton
                    label="Read current"
                    disabled={!hasKey || !uid}
                    title="Read this value from the registry"
                    onClick={() => uid && void readItem(uid)}
                />
                <PropsActionButton
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
                title="Prompt to relaunch as administrator before writing this value. Machine-wide hives always require it."
                checked={!!item.requireElevated || hiveNeedsElevation(hive)}
                disabled={hiveNeedsElevation(hive)}
                onCheckedChange={(v) => patchSelectedItem((it) => { it.requireElevated = v; })}
            />
        </div>

        <Field_ItemName item={item} />
    </>);
}

// ---------------------------------------------------------------------------
// Item fields

/** Delay before showing key-path errors while typing (ms). */
const KEY_PATH_VALIDATE_DELAY_MS = 400;

function Field_KeyPath({ item, onJump }: { item: RegItem; onJump: () => void; }) {
    const { strictKeyPathValidation } = useSnapshot(registryEditorStore);
    const debouncedPath = useDebouncedValue(item.keyPath, KEY_PATH_VALIDATE_DELAY_MS);
    const pathToValidate = strictKeyPathValidation ? item.keyPath : debouncedPath;
    const error = validateItemKeyPath(pathToValidate);
    const hasText = item.keyPath.length > 0;
    const canJump = itemHasSubKey(item);

    return (
        <LabelAndField
            label="Key path"
            labelHint="Hive plus subkey, stored as typed (HKCU or HKEY_CURRENT_USER, \\ or /). Normalized only when reading, writing, or opening in regedit."
            error={error}
        >
            <InputGroup>
                <InputGroupInput
                    className="font-mono text-[0.72rem]"
                    value={item.keyPath}
                    placeholder="HKEY_CURRENT_USER\SOFTWARE\Vendor\Product"
                    aria-invalid={!!error}
                    onChange={(e) => {
                        patchSelectedItem((it) => {
                            it.keyPath = e.target.value;
                        });
                    }}
                    {...turnOffAutoComplete}
                />

                <InputGroupAddon className="p-0 pr-1.5 gap-0.5" align="inline-end">
                    <InputGroupButton
                        // aria-disabled (not disabled): InputGroup's has-disabled:opacity-50
                        // would dim the whole field.
                        className={!hasText ? "opacity-50" : undefined}
                        size="icon-xs"
                        title={hasText ? "Copy key path" : "Nothing to copy"}
                        aria-label="Copy key path"
                        aria-disabled={!hasText}
                        onClick={() => {
                            if (!hasText) {
                                return;
                            }
                            void navigator.clipboard.writeText(item.keyPath).catch((e) => {
                                notice.error(`Failed to copy key path:<br/>${String(e)}`);
                            });
                        }}
                        tabIndex={-1}
                    >
                        <Copy className="size-3.5 stroke-[1.5px]" />
                    </InputGroupButton>

                    <InputGroupButton
                        className={!hasText ? "opacity-50" : undefined}
                        size="icon-xs"
                        title={hasText ? "Clear key path" : "Already empty"}
                        aria-label="Clear key path"
                        aria-disabled={!hasText}
                        onClick={() => {
                            if (!hasText) {
                                return;
                            }
                            patchSelectedItem((it) => { it.keyPath = ""; });
                        }}
                        tabIndex={-1}
                    >
                        <X className="size-3.5 stroke-[1.5px]" />
                    </InputGroupButton>

                    <InputGroupButton
                        className={!canJump ? "opacity-50" : undefined}
                        size="icon-xs"
                        title={canJump ? `Open regedit at ${fullKeyPath(item)}` : "Set a key path first"}
                        aria-label="Open in regedit"
                        aria-disabled={!canJump}
                        onClick={() => {
                            if (canJump) {
                                onJump();
                            }
                        }}
                        tabIndex={-1}
                    >
                        <SquareArrowOutUpRight className="size-3.5 stroke-[1.5px]" />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
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
