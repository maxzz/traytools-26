import { type ComponentProps } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils/classnames";
import { Menu } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { type AddCopyKind } from "@/components/2-main/5-tab-copy-operations/a-atoms/9-types-copy";
import { addNode, isRootUid, removeNode } from "@/components/2-main/5-tab-copy-operations/a-atoms/1-copy-editor-atoms";
import { copyEditorStore } from "@/components/2-main/5-tab-copy-operations/a-atoms/0-copy-local-storage";

export function TreeViewMenu({className, ...rest}: ComponentProps<typeof Button>) {
    const { selectedUid } = useSnapshot(copyEditorStore);
    const canDelete = !!selectedUid && !isRootUid(selectedUid);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className={classNames("size-5 rounded scale-90 cursor-pointer", className)} variant="ghost" size="icon-xs"  title="Menu actions" {...rest}>
                    <Menu className="size-2.5" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                {ADD_ITEMS.map(
                    ({ kind, label }) => (
                        <DropdownMenuItem key={kind} onSelect={() => addNode(kind)}>
                            {label}
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

const ADD_ITEMS: { kind: AddCopyKind; label: string; }[] = [
    { kind: "group", label: "Add Group" },
    { kind: "item", label: "Add Copy Item" },
];
