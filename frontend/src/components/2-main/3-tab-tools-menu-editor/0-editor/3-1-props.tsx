import { patchSelectedNode, useSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Textarea } from "@/ui/shadcn/textarea";

export function Field({ label, children }: { label: string; children: React.ReactNode; }) {
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
