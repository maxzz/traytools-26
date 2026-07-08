import { useSnapshot } from "valtio";
import { Minus, Plus, SquarePlus, Trash2 } from "lucide-react";
import { addNode, isRootUid, removeNode, toolsEditor, type NodeKind } from "@/components/2-main/3-tab-tools-menu-editor/a-menu-editor-atoms";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";

const ADD_ITEMS: { kind: NodeKind; label: string; icon: typeof Plus; }[] = [
    { kind: "item", label: "Add command", icon: Plus },
    { kind: "submenu", label: "Add submenu", icon: SquarePlus },
    { kind: "separator", label: "Add separator", icon: Minus },
];

export function TreeToolbar() {
    const { selectedUid } = useSnapshot(toolsEditor);
    const canDelete = !!selectedUid && !isRootUid(selectedUid);

    return (
        <div className="px-2 py-1.5 border-b flex items-center gap-1.5">
            <span className="mr-auto font-medium text-[0.7rem] text-muted-foreground">
                Menu items
            </span>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon-xs" title="Add menu item">
                        <Plus />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                    {ADD_ITEMS.map(({ kind, label, icon: Icon }) => (
                        <DropdownMenuItem key={kind} onSelect={() => addNode(kind)}>
                            <Icon /> {label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <Button
                variant="destructive"
                size="icon-xs"
                title="Remove selected"
                disabled={!canDelete}
                onClick={() => canDelete && selectedUid && removeNode(selectedUid)}
            >
                <Trash2 />
            </Button>
        </div>
    );
}
