import { type ComponentProps } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { Menu } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { useCtrlNAdd } from "../../../a-shared/use-editor-ctrl-s";
import { type AddNodeKind } from "../../a-atoms/9-types-menu";
import { addNode, isRootUid, removeNode } from "../../a-atoms/1-menu-editor-atoms";
import { toolsEditorStore } from "../../a-atoms/0-menu-local-storage";

export function TreeViewMenu({className, ...rest}: ComponentProps<typeof Button>) {
    const { selectedUid } = useSnapshot(toolsEditorStore);
    const canDelete = !!selectedUid && !isRootUid(selectedUid);

    useCtrlNAdd(() => addNode("command"));

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button className={classNames("size-5 rounded scale-90 cursor-pointer", className)} variant="ghost" size="icon-xs"  title="Menu actions" {...rest}>
                    <Menu className="size-2.5" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                {ADD_ITEMS.map(
                    ({ kind, label, shortcut }) => (
                        <DropdownMenuItem key={kind} onSelect={() => addNode(kind)}>
                            {label}
                            {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
                        </DropdownMenuItem>
                    )
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem variant="destructive" disabled={!canDelete} onSelect={() => canDelete && selectedUid && removeNode(selectedUid)}>
                    Delete selected
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const ADD_ITEMS: { kind: AddNodeKind; label: string; shortcut?: string; }[] = [
    { kind: "command", label: "Add Command", shortcut: "Ctrl+N" },
    { kind: "registry", label: "Add Registry Path" },
    { kind: "submenu", label: "Add Menu" },
    { kind: "separator", label: "Add Separator" },
];
