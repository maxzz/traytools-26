import { ShieldCheck } from "lucide-react";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { Textarea } from "@/ui/shadcn/textarea";
import { patchSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { type CmdPlat, type CmdWhat, type ToolMenuItem, effectiveRunElevated } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/9-types-menu";

type NodeProps = { node: ToolMenuItem; };

export function Props_Separator({ node }: NodeProps) {
    return (<>
        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the menu.
        </p>
        <CommentField node={node} />
    </>);
}

export function Props_Submenu({ node, isRoot }: NodeProps & { isRoot?: boolean; }) {
    return (<>
        <LabelAndField label="Name">
            <Input
                value={node.menuName}
                placeholder="Submenu name"
                onChange={(e) => patchSelectedNode((n) => { n.menuName = e.target.value; })}
            />
        </LabelAndField>

        <CommentField node={node} />

        {isRoot && (
            <p className="text-muted-foreground">
                This is the root of the Tools menu. New items are added inside it. It cannot be moved or deleted.
            </p>
        )}
    </>);
}

export function Props_Item({ node }: NodeProps) {
    return (<>
        <LabelAndField label="Name">
            <Input
                value={node.menuName}
                placeholder="Menu label"
                onChange={(e) => patchSelectedNode((n) => { n.menuName = e.target.value; })}
            />
        </LabelAndField>

        <CmdWhatField node={node} />
        <CmdLineField node={node} />
        <CmdArgsField node={node} />

        <div className="grid grid-cols-2 gap-3">
            <CmdPlatField node={node} />
            <HotKeyField node={node} />
        </div>

        <RunElevatedField node={node} />

        <CommentField node={node} />
    </>);
}

// --------------------------------------------------------------------------
// Fields

function LabelAndField({ label, children }: { label: string; children: React.ReactNode; }) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}

function CommentField({ node }: NodeProps) {
    return (
        <LabelAndField label="Comment">
            <Textarea
                value={node.comment ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v.trim()) { n.comment = v; } else { delete n.comment; }
                })}
            />
        </LabelAndField>
    );
}

function CmdWhatField({ node }: NodeProps) {
    return (
        <LabelAndField label="Type">
            <Select
                value={node.cmdWhat ?? "rel"}
                onValueChange={(v) => patchSelectedNode((n) => { n.cmdWhat = v as CmdWhat; })}
            >
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="rel">Relative path</SelectItem>
                    <SelectItem value="abs">Absolute path / URL</SelectItem>
                    <SelectItem value="reg">Registry key</SelectItem>
                </SelectContent>
            </Select>
        </LabelAndField>
    );
}

function CmdLineField({ node }: NodeProps) {
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

function CmdArgsField({ node }: NodeProps) {
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

function CmdPlatField({ node }: NodeProps) {
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

function HotKeyField({ node }: NodeProps) {
    return (
        <LabelAndField label="Hotkey">
            <Input
                value={node.hotKey ?? ""}
                placeholder="e.g. F4"
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v) { n.hotKey = v; } else { delete n.hotKey; }
                })}
            />
        </LabelAndField>
    );
}

function RunElevatedField({ node }: NodeProps) {
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
