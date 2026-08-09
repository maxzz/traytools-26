import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { Textarea } from "@/ui/shadcn/textarea";
import { HotkeyInput, formatHotkey, parseHotkey, type HotkeyChord } from "@/ui/local-ui/9-hotkey";
import { CollapsibleOptionalField } from "@/components/2-main/a-shared/collapsible-optional-field";
import {
    Field_TypeIcon as TypeIconBadge,
    LabelAndField,
    PropsActionButton,
    typeBadgeIcons,
} from "@/components/2-main/a-shared/props-shared-controls";
import { ToolsConfig_ExecuteByUid } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/0-menu-local-storage";
import { patchSelectedNode } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/use-selected-node";
import { type ToolMenuItem, isRegistryPath, nodeKind } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/9-types-menu";

export type NodeProps = { node: ToolMenuItem; };

export function Field_MenuName({ node, isSubmenu }: NodeProps & { isSubmenu?: boolean; }) {
    return (
        <LabelAndField label={isSubmenu ? "Submenu name" : "Menu label"}>
            <Input
                className="h-7"
                value={node.menuName}
                onChange={(e) => patchSelectedNode((n) => { n.menuName = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

export function Field_HotKey({ node }: NodeProps) {
    const chord = parseHotkey(node.hotKey);
    const isGlobal = !!node.hotKeyGlobal;

    function setChord(next: HotkeyChord | null) {
        patchSelectedNode((n) => {
            const text = formatHotkey(next);
            if (text) {
                n.hotKey = text;
            } else {
                delete n.hotKey;
                delete n.hotKeyGlobal;
            }
        });
    }

    function setGlobal(global: boolean) {
        patchSelectedNode((n) => {
            if (global && n.hotKey) {
                n.hotKeyGlobal = true;
            } else {
                delete n.hotKeyGlobal;
            }
        });
    }

    return (
        <LabelAndField className="w-36" label="Hotkey">
            <HotkeyInput
                value={chord}
                onChange={setChord}
                isGlobal={isGlobal}
                onIsGlobalChange={setGlobal}
                tabIndex={-1}
            />
        </LabelAndField>
    );
}

export function Field_Comment({ node }: NodeProps) {
    return (
        <CollapsibleOptionalField label="Comment" value={node.comment ?? ""}>
            <Textarea
                className="px-3 resize-none"
                value={node.comment ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v.trim()) { n.comment = v; } else { delete n.comment; }
                })}
                {...turnOffAutoComplete}
            />
        </CollapsibleOptionalField>
    );
}

export function Field_TypeIcon({ node }: { node: ToolMenuItem; }) {
    const kind = nodeKind(node);
    const isRegistry = kind === "item" && isRegistryPath(node);
    const label =
        kind === "submenu"
            ? "Menu"
            : kind === "separator"
                ? "Separator"
                : isRegistry
                    ? "Registry Path"
                    : kind === "item"
                        ? "Command"
                        : "Properties";
    const icon =
        kind === "separator"
            ? undefined
            : kind === "submenu"
                ? typeBadgeIcons.folder
                : isRegistry
                    ? typeBadgeIcons.registry
                    : typeBadgeIcons.command;

    return <TypeIconBadge label={label} icon={icon} />;
}

export function ExecuteCommandButton({ node }: NodeProps) {
    const canExecute = !!(node.cmdLine?.trim());
    const uid = node.uid;

    return (
        <PropsActionButton
            label="Execute"
            disabled={!canExecute || !uid}
            title={canExecute
                ? "Run this command as if selected from the Tools menu"
                : "Set a command / path / URL first"}
            onClick={() => uid && void ToolsConfig_ExecuteByUid(uid)}
        />
    );
}
