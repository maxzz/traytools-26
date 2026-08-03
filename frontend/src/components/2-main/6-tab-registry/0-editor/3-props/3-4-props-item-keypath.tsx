import { useSnapshot } from "valtio";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { useDebouncedValue } from "@/utils/util-hooks";
import { Copy, SquareArrowOutUpRight, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { notice } from "@/ui/local-ui/7-toaster";
import { LabelAndField } from "@/components/2-main/a-shared/props-field-ui";
import {
    type RegItem,
    fullKeyPath,
    itemHasSubKey,
    validateItemKeyPath,
} from "../../a-atoms/9-types-registry";
import { registryEditorStore } from "../../a-atoms/0-registry-local-storage";
import { patchSelectedItem } from "../../a-atoms/use-selected-node";

/** Delay before showing key-path errors while typing (ms). */
const KEY_PATH_VALIDATE_DELAY_MS = 400;

export function Field_KeyPath({ item, onJump }: { item: RegItem; onJump: () => void; }) {
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
