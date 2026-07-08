import { useSnapshot } from "valtio";
import { Menu, Minus, Plus, SquarePlus, Trash2 } from "lucide-react";
import { addNode, isRootUid, removeNode, toolsEditor, type NodeKind } from "@/components/2-main/3-tab-tools-menu-editor/a-menu-editor-atoms";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";

const ADD_ITEMS: { kind: NodeKind; label: string; icon: typeof Plus; }[] = [
    { kind: "item", label: "Add command", icon: Plus },
    { kind: "submenu", label: "Add submenu", icon: SquarePlus },
    { kind: "separator", label: "Add separator", icon: Minus },
];

export function TreeViewMenu() {
    const { selectedUid } = useSnapshot(toolsEditor);
    const canDelete = !!selectedUid && !isRootUid(selectedUid);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="absolute top-1 right-1 z-10" variant="outline" size="icon-xs" title="Menu actions">
                    <Menu />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                {ADD_ITEMS.map(({ kind, label, icon: Icon }) => (
                    <DropdownMenuItem key={kind} onSelect={() => addNode(kind)}>
                        <Icon /> {label}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    variant="destructive"
                    disabled={!canDelete}
                    onSelect={() => canDelete && selectedUid && removeNode(selectedUid)}
                >
                    <Trash2 /> Delete selected
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
