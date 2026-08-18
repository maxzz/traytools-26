import { type ComponentProps, useEffect } from "react";
import { useSnapshot } from "valtio";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/utils/classnames";
import { type ComboMruKey } from "./uitils-combo-mru";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { comboMruStore } from "./a-combo-mru-store";
import { closeComboMru, comboMruOpenKey, comboMruUi, rememberComboMru, removeComboMru } from "./uitils-combo-mru-ui";

type ComboMruInputProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
    listId: ComboMruKey;
    instanceId: string;
    value: string;
    onValueChange: (value: string) => void;
    canRemember?: (value: string) => boolean; // When omitted, any non-empty trimmed value is stored.
    itemLabel?: (value: string) => string;
    recentLabel?: string;
    emptyLabel?: string;
};

export function ComboMruInput({
    listId,
    instanceId,
    value,
    onValueChange,
    canRemember,
    itemLabel,
    recentLabel = "Recent items",
    emptyLabel = "No recent items",
    className,
    onBlur,
    ...inputProps
}: ComboMruInputProps) {
    const items = useSnapshot(comboMruStore)[listId];
    const { openKey } = useSnapshot(comboMruUi);
    const key = comboMruOpenKey(listId, instanceId);
    const open = openKey === key;

    useEffect(
        () => {
            return () => {
                if (comboMruUi.openKey === key) {
                    closeComboMru();
                }
            };
        },
        [key]);

    function commitRemember(next: string) {
        if (canRemember ? canRemember(next) : true) {
            rememberComboMru(listId, next);
        }
    }

    function selectItem(item: string) {
        onValueChange(item);
        rememberComboMru(listId, item);
        closeComboMru();
    }

    return (
        <Popover modal={false} open={open} onOpenChange={(next) => { comboMruUi.openKey = next ? key : null; }}>
            <PopoverAnchor asChild>
                <InputGroup className={cn("w-auto flex-1", className)}>
                    <InputGroupInput
                        value={value}
                        onChange={(e) => onValueChange(e.target.value)}
                        onBlur={(e) => { commitRemember(e.target.value); onBlur?.(e); }}
                        {...turnOffAutoComplete}
                        {...inputProps}
                    />

                    <InputGroupAddon className="p-0 pr-2.5" align="inline-end">
                        <PopoverTrigger asChild>
                            <InputGroupButton
                                size="icon-xs"
                                tabIndex={-1}
                                title={recentLabel}
                                aria-label={recentLabel}
                                aria-haspopup="listbox"
                                type="button"
                            >
                                <ChevronDown className="size-3.5 stroke-[1.5px]" />
                            </InputGroupButton>
                        </PopoverTrigger>
                    </InputGroupAddon>

                </InputGroup>
            </PopoverAnchor>

            <PopoverContent
                className="p-1 w-(--radix-popper-anchor-width) max-h-48 rounded overflow-y-auto gap-0 z-100"
                data-combo-mru-popup=""
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => { if (items.length === 0) { e.preventDefault(); } }}
            >
                {!items.length
                    ? (
                        <div className="px-1.5 py-1 text-xs text-muted-foreground">
                            {emptyLabel}
                        </div>
                    ) : (
                        <div role="listbox" aria-label={recentLabel}>
                            {items.map(
                                (item) => (
                                    <div key={item} className="relative group/mru">
                                        <button
                                            className={itemButtonClasses}
                                            onClick={() => selectItem(item)}
                                            title={item}
                                            role="option"
                                            type="button"
                                        >
                                            <span className="min-w-0 font-mono truncate">
                                                {itemLabel ? itemLabel(item) : item}
                                            </span>
                                        </button>

                                        <button
                                            className={removeButtonClasses}
                                            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeComboMru(listId, item); }}
                                            title="Remove from recent list"
                                            aria-label={`Remove ${item} from recent list`}
                                            type="button"
                                        >
                                            <X className="size-3.5 stroke-[1.5px]" />
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    )
                }
            </PopoverContent>
        </Popover>
    );
}

const itemButtonClasses = "\
relative px-1.5 py-1 pr-7 w-full text-xs text-left \
hover:text-accent-foreground \
hover:bg-accent \
rounded-sm \
flex items-center \
cursor-pointer";

const removeButtonClasses = "\
absolute top-1/2 right-1 p-0.5 \
text-muted-foreground \
opacity-0 \
group-hover/mru:opacity-100 \
hover:text-foreground hover:bg-foreground/10 \
rounded \
z-10 -translate-y-1/2";
