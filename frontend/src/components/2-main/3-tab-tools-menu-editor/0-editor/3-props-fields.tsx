import { Label } from "@/ui/shadcn/label";
import { Textarea } from "@/ui/shadcn/textarea";
import { patchSelectedNode, useSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/0-editor/use-selected-node";

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
