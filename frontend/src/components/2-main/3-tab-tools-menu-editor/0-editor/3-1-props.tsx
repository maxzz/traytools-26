import { CommentField, Field } from "@/components/2-main/3-tab-tools-menu-editor/0-editor/3-2-props-fields";
import { patchSelectedNode, useSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { Input } from "@/ui/shadcn/input";

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
