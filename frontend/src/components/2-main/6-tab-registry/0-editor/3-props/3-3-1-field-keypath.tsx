import { type ClipboardEvent, useRef } from "react";
import { useSnapshot } from "valtio";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { useDebouncedValue } from "@/utils/util-hooks";
import { notice } from "@/ui/local-ui/7-toaster";
import { ChevronDown, Copy, SquareArrowOutUpRight, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { LabelAndField } from "@/components/2-main/a-shared/props-field-ui";
import { type RegItem, fullKeyPath, itemHasSubKey, parseHiveAlias, validateItemKeyPath } from "../../a-atoms/9-types-registry";
import { registryEditorStore, rememberKeyPathMru, removeKeyPathMru } from "../../a-atoms/0-registry-local-storage";
import { patchSelectedItem } from "../../a-atoms/use-selected-node";

export function Field_KeyPath({ item, onJump }: { item: RegItem; onJump: () => void; }) {
    const { strictKeyPathValidation, keyPathMru } = useSnapshot(registryEditorStore);
    const debouncedPath = useDebouncedValue(item.keyPath, KEY_PATH_VALIDATE_DELAY_MS);
    const pathToValidate = strictKeyPathValidation ? item.keyPath : debouncedPath;
    const error = validateItemKeyPath(pathToValidate);
    const hasText = item.keyPath.length > 0;
    const canJump = itemHasSubKey(item);
    const hasMru = keyPathMru.length > 0;
    const pathAtFocusRef = useRef(item.keyPath);

    return (
        <LabelAndField
            label="Key path"
            labelHint="Hive plus subkey, stored as typed (HKCU or HKEY_CURRENT_USER, \\ or /). Normalized only when reading, writing, or opening in regedit."
            error={error}
        >
            <InputGroup>
                <InputGroupInput
                    className=""
                    value={item.keyPath}
                    placeholder="HKEY_CURRENT_USER\SOFTWARE\Vendor\Product"
                    aria-invalid={!!error}
                    onChange={(e) => {
                        patchSelectedItem((it) => {
                            it.keyPath = e.target.value;
                        });
                    }}
                    onFocus={() => {
                        pathAtFocusRef.current = item.keyPath;
                    }}
                    onBlur={() => {
                        const path = item.keyPath;
                        if (path !== pathAtFocusRef.current) {
                            rememberKeyPathMru(path);
                        }
                    }}
                    onPaste={onKeyPathPaste}
                    {...turnOffAutoComplete}
                />

                <InputGroupAddon className="p-0 pr-1.5 gap-0" align="inline-end">
                    {hasMru ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <InputGroupButton
                                    size="icon-xs"
                                    title="Recent key paths"
                                    aria-label="Recent key paths"
                                    tabIndex={-1}
                                >
                                    <ChevronDown className="size-3.5 stroke-[1.5px]" />
                                </InputGroupButton>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="min-w-72 max-w-xl">
                                {keyPathMru.map((path) => (
                                    <DropdownMenuItem
                                        key={path}
                                        className="justify-between gap-2 pr-1"
                                        title={path}
                                        onSelect={() => {
                                            patchSelectedItem((it) => { it.keyPath = path; });
                                        }}
                                    >
                                        <span className="min-w-0 truncate">{path}</span>
                                        <button
                                            type="button"
                                            className="shrink-0 p-0.5 rounded opacity-0 group-hover/dropdown-menu-item:opacity-100 hover:bg-foreground/10 text-muted-foreground hover:text-foreground"
                                            title="Remove from recent list"
                                            aria-label={`Remove ${path} from recent list`}
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                removeKeyPathMru(path);
                                            }}
                                        >
                                            <X className="size-3.5 stroke-[1.5px]" />
                                        </button>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <InputGroupButton
                            className="opacity-50"
                            size="icon-xs"
                            title="No recent key paths yet"
                            aria-label="Recent key paths"
                            aria-disabled
                            tabIndex={-1}
                        >
                            <ChevronDown className="size-3.5 stroke-[1.5px]" />
                        </InputGroupButton>
                    )}

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

const KEY_PATH_VALIDATE_DELAY_MS = 400; // Delay before showing key-path errors while typing (ms).

// --------------------------------------------------------------------------
// Helper functions

function onKeyPathPaste(e: ClipboardEvent<HTMLInputElement>) {
    const raw = e.clipboardData.getData("text");
    const pasted = stripRegeditAddressPrefix(raw);
    if (pasted === raw) {
        return;
    }

    e.preventDefault();
    const input = e.currentTarget;
    const current = input.value;
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    const next = current.slice(0, start) + pasted + current.slice(end);
    patchSelectedItem((it) => { it.keyPath = next; });

    const caret = start + pasted.length;
    requestAnimationFrame(() => {
        input.setSelectionRange(caret, caret);
    });
}

/**
 * Strip a regedit address-bar root so only hive\subkey remains.
 * Handles `Computer\…`, `HOSTNAME\…`, `1.2.3.4\…`, and `\\HOSTNAME\…`
 * when the following segment is a known hive.
 */
export function stripRegeditAddressPrefix(text: string): string {
    let s = text.trim();
    if (!s) {
        return s;
    }

    // UNC-style remote root: \\server\HKEY_…
    const unc = /^\\\\([^\\/]+)[\\/]/.exec(s);
    if (unc) {
        const rest = s.slice(unc[0].length);
        if (segmentIsHive(rest)) {
            s = rest;
        }
    }

    // Local regedit root, or remote shown as Computer\HOST\HKEY_…
    s = stripLeadingSegment(s, (head) => head.toUpperCase() === "COMPUTER");

    // Remaining host / IP before a hive: MYPC\HKEY_… or 192.168.0.1\HKLM\…
    s = stripLeadingSegment(s, (head, rest) => !parseHiveAlias(head) && segmentIsHive(rest));

    return s;
}

function segmentIsHive(path: string): boolean {
    const head = path.split(/[\\/]/, 1)[0] ?? "";
    return !!parseHiveAlias(head);
}

function stripLeadingSegment(path: string, shouldStrip: (head: string, rest: string) => boolean): string {
    const match = /^([^\\/]+)[\\/]([\s\S]*)$/.exec(path);
    if (!match) {
        return path;
    }
    const [, head, rest] = match;
    return shouldStrip(head, rest) ? rest : path;
}
