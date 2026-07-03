import { useState } from "react";
import { useSnapshot } from "valtio";
import { ChevronDown, ChevronRight, ChevronUp, FolderPlus, Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/utils/classnames";
import { markDirty, type CmdPlat, type CmdWhat, type ToolMenuItem } from "@/store/5-tools-editor";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";

type NodeKind = "separator" | "submenu" | "item";

function nodeKind(node: { menuName: string; menuItems?: readonly unknown[]; cmdLine?: string; }): NodeKind {
    if (node.menuItems) {
        return "submenu";
    }
    if (node.menuName.trim() === "-" && !node.cmdLine) {
        return "separator";
    }
    return "item";
}

// ---------------------------------------------------------------------------
// Array mutations (operate on the valtio proxy array, then flag the tree dirty).

function newItem(): ToolMenuItem {
    return { menuName: "New Command", cmdLine: "", cmdWhat: "abs" };
}

function newSubmenu(): ToolMenuItem {
    return { menuName: "New Submenu", menuItems: [] };
}

function newSeparator(): ToolMenuItem {
    return { menuName: "-" };
}

function addNode(items: ToolMenuItem[], kind: NodeKind) {
    items.push(kind === "submenu" ? newSubmenu() : kind === "separator" ? newSeparator() : newItem());
    markDirty();
}

function removeNode(items: ToolMenuItem[], index: number) {
    items.splice(index, 1);
    markDirty();
}

function moveNode(items: ToolMenuItem[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) {
        return;
    }
    const [moved] = items.splice(index, 1);
    items.splice(target, 0, moved);
    markDirty();
}

// ---------------------------------------------------------------------------

export function ToolsNodeList({ items, depth = 0 }: { items: ToolMenuItem[]; depth?: number; }) {
    const snap = useSnapshot(items);

    return (
        <div className={cn("flex flex-col gap-1.5", depth > 0 && "border-l border-border/60 pl-3 ml-1")}>
            {snap.map(
                (_, index) => (
                    <ToolsNodeEditor key={index} items={items} index={index} depth={depth} />
                )
            )}

            <div className="pt-0.5 flex items-center gap-1.5">
                <Button variant="outline" size="xs" onClick={() => addNode(items, "item")}>
                    <Plus /> Command
                </Button>
                <Button variant="outline" size="xs" onClick={() => addNode(items, "submenu")}>
                    <FolderPlus /> Submenu
                </Button>
                <Button variant="outline" size="xs" onClick={() => addNode(items, "separator")}>
                    <Minus /> Separator
                </Button>
            </div>
        </div>
    );
}

function ToolsNodeEditor({ items, index, depth }: { items: ToolMenuItem[]; index: number; depth: number; }) {
    const node = items[index];
    const snap = useSnapshot(node);
    const kind = nodeKind(snap);
    const [open, setOpen] = useState(true);

    const rowControls = (
        <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-xs" title="Move up" disabled={index === 0} onClick={() => moveNode(items, index, -1)}>
                <ChevronUp />
            </Button>
            <Button variant="ghost" size="icon-xs" title="Move down" disabled={index === items.length - 1} onClick={() => moveNode(items, index, 1)}>
                <ChevronDown />
            </Button>
            <Button variant="destructive" size="icon-xs" title="Delete" onClick={() => removeNode(items, index)}>
                <Trash2 />
            </Button>
        </div>
    );

    if (kind === "separator") {
        return (
            <div className="px-2 py-1 bg-muted/30 border border-dashed border-border/70 rounded-md flex items-center gap-2">
                <span className="flex-1 border-t border-border/70" />
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Separator</span>
                <span className="flex-1 border-t border-border/70" />
                {rowControls}
            </div>
        );
    }

    if (kind === "submenu") {
        const children = node.menuItems!;
        return (
            <div className="px-2 py-1.5 bg-card border rounded-md">
                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon-xs" onClick={() => setOpen((v) => !v)} title={open ? "Collapse" : "Expand"}>
                        {open ? <ChevronDown /> : <ChevronRight />}
                    </Button>

                    <FolderPlus className="size-3.5 text-muted-foreground" />

                    <Input className="flex-1 h-7" value={snap.menuName} placeholder="Submenu name" onChange={(e) => { node.menuName = e.target.value; markDirty(); }} />
                    {rowControls}
                </div>

                {open && (
                    <div className="mt-1.5">
                        <ToolsNodeList items={children} depth={depth + 1} />
                    </div>
                )}
            </div>
        );
    }

    // Command leaf.
    return (
        <div className="px-2 py-2 bg-card border rounded-md">
            <div className="flex items-start gap-1.5">
                <div className="flex-1 sm:grid-cols-[minmax(0,1fr)_auto] grid grid-cols-1 gap-2">
                    <Field label="Name">
                        <Input className="h-7" value={snap.menuName} placeholder="Menu label" onChange={(e) => { node.menuName = e.target.value; markDirty(); }} />
                    </Field>

                    <Field label="Type">
                        <Select value={snap.cmdWhat ?? "rel"} onValueChange={(v) => { node.cmdWhat = v as CmdWhat; markDirty(); }}>
                            <SelectTrigger className="h-7 w-28">
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="rel">Relative</SelectItem>
                                <SelectItem value="abs">Absolute</SelectItem>
                                <SelectItem value="reg">Registry</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field label={snap.cmdWhat === "reg" ? "Registry key" : "Command / path / URL"} className="sm:col-span-2">
                        <Input
                            className="h-7 font-mono text-[0.72rem]"
                            value={snap.cmdLine ?? ""}
                            placeholder={snap.cmdWhat === "reg" ? "HKLM\\SOFTWARE\\..." : "notepad.exe or https://..."}
                            onChange={(e) => { node.cmdLine = e.target.value; markDirty(); }}
                        />
                    </Field>

                    <Field label="Arguments">
                        <Input
                            className="h-7 font-mono text-[0.72rem]"
                            value={snap.cmdArgs ?? ""}
                            placeholder="(optional)"
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v) { node.cmdArgs = v; } else { delete node.cmdArgs; }
                                markDirty();
                            }}
                        />
                    </Field>

                    <div className="flex gap-2">
                        <Field label="Platform">
                            <Select
                                value={snap.cmdPlat ?? "curr"}
                                onValueChange={(v) => {
                                    if (v === "curr") { delete node.cmdPlat; } else { node.cmdPlat = v as CmdPlat; }
                                    markDirty();
                                }}
                            >
                                <SelectTrigger className="h-7 w-24">
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
                                className="h-7 w-20"
                                value={snap.hotKey ?? ""}
                                placeholder="F4"
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v) { node.hotKey = v; } else { delete node.hotKey; }
                                    markDirty();
                                }}
                            />
                        </Field>
                    </div>
                </div>

                {rowControls}
            </div>
        </div>
    );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string; }) {
    return (
        <div className={cn("flex flex-col gap-1", className)}>
            <Label className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}
