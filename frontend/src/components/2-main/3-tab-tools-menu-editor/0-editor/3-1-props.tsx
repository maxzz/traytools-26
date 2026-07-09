import { ShieldCheck } from "lucide-react";
import { effectiveRunElevated, type CmdPlat, type CmdWhat } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/a-menu-editor-atoms";
import { patchSelectedNode, useSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { Textarea } from "@/ui/shadcn/textarea";

function Field({ label, children }: { label: string; children: React.ReactNode; }) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}

export function CommentField() {
    const { node } = useSelectedNode();
    if (!node) {
        return null;
    }

    return (
        <Field label="Comment">
            <Textarea
                value={node.comment ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v.trim()) { n.comment = v; } else { delete n.comment; }
                })}
            />
        </Field>
    );
}

export function Props_Separator() {
    return (<>
        <p className="text-muted-foreground">
            A separator draws a horizontal divider line in the menu.
        </p>
        <CommentField />
    </>);
}

export function Props_Submenu() {
    const { node, isRoot } = useSelectedNode();
    if (!node) {
        return null;
    }

    return (<>
        <Field label="Name">
            <Input
                value={node.menuName}
                placeholder="Submenu name"
                onChange={(e) => patchSelectedNode((n) => { n.menuName = e.target.value; })}
            />
        </Field>

        <CommentField />

        {isRoot && (
            <p className="text-muted-foreground">
                This is the root of the Tools menu. New items are added inside it. It cannot be moved or deleted.
            </p>
        )}
    </>);
}

export function Props_Item() {
    const { node } = useSelectedNode();
    if (!node) {
        return null;
    }

    return (<>
        <Field label="Name">
            <Input
                value={node.menuName}
                placeholder="Menu label"
                onChange={(e) => patchSelectedNode((n) => { n.menuName = e.target.value; })}
            />
        </Field>

        <Field label="Type">
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
        </Field>

        <Field label={node.cmdWhat === "reg" ? "Registry key" : "Command / path / URL"}>
            <Input
                className="font-mono text-[0.72rem]"
                value={node.cmdLine ?? ""}
                placeholder={node.cmdWhat === "reg" ? "HKLM\\SOFTWARE\\..." : "notepad.exe or https://..."}
                onChange={(e) => patchSelectedNode((n) => { n.cmdLine = e.target.value; })}
            />
        </Field>

        <Field label="Arguments">
            <Input
                className="font-mono text-[0.72rem]"
                value={node.cmdArgs ?? ""}
                placeholder="(optional)"
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v) { n.cmdArgs = v; } else { delete n.cmdArgs; }
                })}
            />
        </Field>

        <div className="grid grid-cols-2 gap-3">
            <Field label="Platform">
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
            </Field>

            <Field label="Hotkey">
                <Input
                    value={node.hotKey ?? ""}
                    placeholder="e.g. F4"
                    onChange={(e) => patchSelectedNode((n) => {
                        const v = e.target.value;
                        if (v) { n.hotKey = v; } else { delete n.hotKey; }
                    })}
                />
            </Field>
        </div>

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

        <CommentField />
    </>);
}
