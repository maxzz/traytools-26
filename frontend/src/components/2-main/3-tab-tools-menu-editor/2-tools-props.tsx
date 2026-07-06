import { useSnapshot } from "valtio";
import { Folder, Minus, MousePointerClick, Terminal } from "lucide-react";
import { cn } from "@/utils/classnames";
import { findByUid, markDirty, nodeKind, toolsEditor, type CmdPlat, type CmdWhat, type ToolMenuItem } from "@/store/5-tools-editor";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";

// Apply a mutation to the selected node on the live valtio proxy, then flag the
// tree dirty. Reads happen off the snapshot so the panel stays reactive.
function patch(uid: string, fn: (node: ToolMenuItem) => void) {
    const loc = findByUid(toolsEditor.config.menu, uid);
    if (loc) {
        fn(loc.node);
        markDirty();
    }
}

export function ToolsProps() {
    const snap = useSnapshot(toolsEditor);
    const uid = snap.selectedUid;

    const loc = uid ? findByUid(snap.config.menu as unknown as ToolMenuItem, uid) : null;
    const node = loc?.node;

    if (!uid || !node) {
        return (
            <div className="min-h-0 h-full flex flex-col">
                <PanelHeader />
                <div className="flex-1 min-h-0 flex items-center justify-center text-center text-muted-foreground p-6">
                    <div className="flex flex-col items-center gap-2">
                        <MousePointerClick className="size-6 opacity-50" />
                        <span>Select a menu item on the left to edit its properties.</span>
                    </div>
                </div>
            </div>
        );
    }

    const kind = nodeKind(node);

    return (
        <div className="min-h-0 h-full flex flex-col">
            <PanelHeader kind={kind} />

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 flex flex-col gap-3">
                    {kind === "separator" && (
                        <p className="text-muted-foreground">
                            A separator draws a horizontal divider line in the menu. It has no editable properties.
                        </p>
                    )}

                    {kind === "submenu" && (
                        <Field label="Name">
                            <Input
                                value={node.menuName}
                                placeholder="Submenu name"
                                onChange={(e) => patch(uid, (n) => { n.menuName = e.target.value; })}
                            />
                        </Field>
                    )}

                    {kind === "item" && (
                        <>
                            <Field label="Name">
                                <Input
                                    value={node.menuName}
                                    placeholder="Menu label"
                                    onChange={(e) => patch(uid, (n) => { n.menuName = e.target.value; })}
                                />
                            </Field>

                            <Field label="Type">
                                <Select
                                    value={node.cmdWhat ?? "rel"}
                                    onValueChange={(v) => patch(uid, (n) => { n.cmdWhat = v as CmdWhat; })}
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
                                    onChange={(e) => patch(uid, (n) => { n.cmdLine = e.target.value; })}
                                />
                            </Field>

                            <Field label="Arguments">
                                <Input
                                    className="font-mono text-[0.72rem]"
                                    value={node.cmdArgs ?? ""}
                                    placeholder="(optional)"
                                    onChange={(e) => patch(uid, (n) => {
                                        const v = e.target.value;
                                        if (v) { n.cmdArgs = v; } else { delete n.cmdArgs; }
                                    })}
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Platform">
                                    <Select
                                        value={node.cmdPlat ?? "curr"}
                                        onValueChange={(v) => patch(uid, (n) => {
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
                                        onChange={(e) => patch(uid, (n) => {
                                            const v = e.target.value;
                                            if (v) { n.hotKey = v; } else { delete n.hotKey; }
                                        })}
                                    />
                                </Field>
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function PanelHeader({ kind }: { kind?: "separator" | "submenu" | "item"; }) {
    const label = kind === "submenu" ? "Submenu" : kind === "separator" ? "Separator" : kind === "item" ? "Command" : "Properties";
    const Icon = kind === "submenu" ? Folder : kind === "separator" ? Minus : Terminal;

    return (
        <div className="px-3 py-1.5 border-b flex items-center gap-2">
            <span className="text-[0.7rem] font-medium text-muted-foreground uppercase tracking-wide">Properties</span>
            {kind && (
                <span className={cn("ml-auto px-1.5 py-0.5 text-[0.65rem] rounded bg-muted text-muted-foreground inline-flex items-center gap-1")}>
                    <Icon className="size-3" /> {label}
                </span>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode; }) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}
