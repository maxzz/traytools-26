import { type ComponentProps } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { Menu } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { useCtrlNAdd } from "../../a-shared/use-editor-ctrl-s";
import { type AddRegKind } from "../a-atoms/9-types-registry";
import { RegistryImportFileAsGroup, addNode, isRootUid, removeNode } from "../a-atoms/1-registry-editor-atoms";
import { registryEditorStore } from "../a-atoms/0-registry-local-storage";

export function TreeViewMenu({ className, ...rest }: ComponentProps<typeof Button>) {
    const { selectedUid } = useSnapshot(registryEditorStore);
    const canDelete = !!selectedUid && !isRootUid(selectedUid);

    useCtrlNAdd(() => addNode("item"));

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className={classNames("size-5 rounded scale-90 cursor-pointer", className)} variant="ghost" size="icon-xs" title="Menu actions" {...rest}>
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

                <DropdownMenuItem
                    onSelect={() => void RegistryImportFileAsGroup()}
                    title="Add a .reg or .json file as a new group"
                >
                    Add group from file…
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem variant="destructive" disabled={!canDelete} onSelect={() => canDelete && selectedUid && removeNode(selectedUid)}>
                    Delete selected
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const ADD_ITEMS: { kind: AddRegKind; label: string; shortcut?: string; }[] = [
    { kind: "item", label: "Add Registry Key", shortcut: "Ctrl+N" },
    { kind: "group", label: "Add Group" },
    { kind: "separator", label: "Add Separator" },
];
