import type { ComponentProps } from "react";
import { Folder, ShieldCheck } from "lucide-react";
import { cn } from "@/utils/classnames";
import { IconTerminalHero } from "@/ui/icons/normal";
import { SymbolAppRegedit } from "@/ui/icons/symbols";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { Textarea } from "@/ui/shadcn/textarea";
import { patchSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { type CmdPlat, type CmdWhat, type ToolMenuItem, effectiveRunElevated, isRegistryPath, nodeKind } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/9-types-menu";

type NodeProps = { node: ToolMenuItem; };

export function PropsFor_Separator({ node }: NodeProps) {
    return (<>
        <Field_TypeIcon node={node} />

        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the menu.
        </p>

        <Field_Comment node={node} />
    </>);
}

export function PropsFor_Submenu({ node, isRoot }: NodeProps & { isRoot?: boolean; }) {
    return (<>
        <Field_TypeIcon node={node} />

        <Field_MenuName node={node} isSubmenu />

        <Field_Comment node={node} />

        {isRoot && (
            <p className="text-muted-foreground">
                This is the root of the Tools menu. New items are added inside it. It cannot be moved or deleted.
            </p>
        )}
    </>);
}

export function PropsFor_Item({ node }: NodeProps) {
    return (<>
        <Field_TypeIcon node={node} />

        {isRegistryPath(node)
            ? <PropsAs_RegistryItem node={node} />
            : <PropsAs_CommandItem node={node} />
        }
    </>);
}

function PropsAs_CommandItem({ node }: NodeProps) {
    return (<>
        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_MenuName node={node} />
            <Field_HotKey node={node} />
        </div>
        <Field_Comment node={node} />

        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_CmdLineOrRegistryPath node={node} />
            <Field_PathAbsoluteOrRelative node={node} />
            <Field_RunElevated node={node} />
        </div>
        <Field_CmdArgs node={node} />
    </>);
}

function PropsAs_RegistryItem({ node }: NodeProps) {
    return (<>
        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_MenuName node={node} />
            <Field_HotKey node={node} />
        </div>
        <Field_Comment node={node} />

        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_CmdLineOrRegistryPath node={node} />
            <Field_CmdPlatform node={node} />
        </div>
    </>);
}

// --------------------------------------------------------------------------
// Fields

function LabelAndField({ label, children, ...props }: { label: string; } & ComponentProps<"div">) {
    return (
        <div className="flex flex-col gap-0.5" {...props}>
            <Label className="pl-1 text-[0.65rem]">{label}</Label>
            {children}
        </div>
    );
}

function Field_MenuName({ node, isSubmenu }: NodeProps & { isSubmenu?: boolean; }) {
    return (
        <LabelAndField label={isSubmenu ? "Submenu name" : "Menu label"}>
            <Input
                value={node.menuName}
                onChange={(e) => patchSelectedNode((n) => { n.menuName = e.target.value; })}
            />
        </LabelAndField>
    );
}

function Field_Comment({ node }: NodeProps) {
    return (
        <LabelAndField className="-mt-1" label="Comment">
            <Textarea
                // rows={1}
                className="px-3 py-2 min-h-6 rounded-sm resize-none"
                value={node.comment ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v.trim()) { n.comment = v; } else { delete n.comment; }
                })}
            />
        </LabelAndField>
    );
}

function Field_PathAbsoluteOrRelative({ node }: NodeProps) {
    return (
        <LabelAndField label="Type">
            <Select value={node.cmdWhat ?? "rel"} onValueChange={(v) => patchSelectedNode((n) => { n.cmdWhat = v as CmdWhat; })}>
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="rel">Relative path</SelectItem>
                    <SelectItem value="abs">Absolute path / URL</SelectItem>
                </SelectContent>
            </Select>
        </LabelAndField>
    );
}

function Field_CmdLineOrRegistryPath({ node }: NodeProps) {
    return (
        <LabelAndField label={node.cmdWhat === "reg" ? "Registry key" : "Command / path / URL"}>
            <Input
                className="font-mono text-[0.72rem]"
                value={node.cmdLine ?? ""}
                placeholder={node.cmdWhat === "reg" ? "HKLM\\SOFTWARE\\..." : "notepad.exe or https://..."}
                onChange={(e) => patchSelectedNode((n) => { n.cmdLine = e.target.value; })}
            />
        </LabelAndField>
    );
}

function Field_CmdArgs({ node }: NodeProps) {
    return (
        <LabelAndField label="Arguments">
            <Input
                className="font-mono text-[0.72rem]"
                value={node.cmdArgs ?? ""}
                placeholder="(optional)"
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v) { n.cmdArgs = v; } else { delete n.cmdArgs; }
                })}
            />
        </LabelAndField>
    );
}

function Field_CmdPlatform({ node }: NodeProps) {
    return (
        <LabelAndField label="Platform">
            <Select
                value={node.cmdPlat ?? "curr"}
                onValueChange={(v) => patchSelectedNode((n) => {
                    if (v === "curr") { delete n.cmdPlat; } else { n.cmdPlat = v as CmdPlat; }
                })}
            >
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="curr">Current</SelectItem>
                    <SelectItem value="32">32-bit</SelectItem>
                    <SelectItem value="64">64-bit</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                </SelectContent>
            </Select>
        </LabelAndField>
    );
}

function Field_HotKey({ node }: NodeProps) {
    return (
        <LabelAndField label="Hotkey">
            <Input
                className="w-20 font-mono text-[0.72rem]"
                value={node.hotKey ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v) { n.hotKey = v; } else { delete n.hotKey; }
                })}
                // placeholder="e.g. F4"
            />
        </LabelAndField>
    );
}

function Field_RunElevated({ node }: NodeProps) {
    return (
        <label className="mt-1 px-2.5 py-2 bg-muted/40 border rounded-md flex items-center gap-2 cursor-pointer">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <div className="mr-auto flex flex-col">
                <span className="font-medium">Run elevated</span>
                <span className="text-[0.7rem] text-muted-foreground">Launch this command with administrator privileges.</span>
            </div>
            <Switch
                checked={effectiveRunElevated(node)}
                onCheckedChange={(checked) => patchSelectedNode((n) => { n.runElevated = checked; })}
            />
        </label>
    );
}

function Field_TypeIcon({ node }: { node: ToolMenuItem; }) {
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
    const iconClass = cn(
        "shrink-0 size-3.5",
        kind === "submenu"
            ? "text-yellow-900 dark fill-yellow-200 stroke-1 dark:text-yellow-400 dark:fill-yellow-900"
            : isRegistry
                ? ""
                : "text-foreground/70 fill-foreground/10!",
    );
    return (
        <div className={"px-2 py-1 w-fit text-[0.65rem] text-muted-foreground bg-muted border rounded inline-flex items-center gap-1"}>
            {kind !== "separator" && (
                kind === "submenu"
                    ? <Folder className={iconClass} />
                    : isRegistry
                        ? <SymbolAppRegedit className={iconClass} />
                        : <IconTerminalHero className={iconClass} />
            )}
            {label}
        </div>
    );
}
