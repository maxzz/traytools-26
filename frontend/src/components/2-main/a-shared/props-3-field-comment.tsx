import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Textarea } from "@/ui/shadcn/textarea";
import { CollapsibleOptionalField } from "@/components/2-main/a-shared/props-2-collapsible-optional-field";

/** Optional note stored in the config JSON; omitted when empty. */
export function Field_Comment({ value, onChange }: { value: string; onChange: (next: string) => void; }) {
    return (
        <CollapsibleOptionalField label="Comment" value={value}>
            <Textarea
                className="px-3 resize-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                {...turnOffAutoComplete}
            />
        </CollapsibleOptionalField>
    );
}

/** Apply typed comment text: set when non-empty (after trim), otherwise delete. */
export function applyComment(target: { comment?: string; }, next: string): void {
    if (next.trim()) {
        target.comment = next;
    } else {
        delete target.comment;
    }
}

/** Keep a non-empty comment from loaded JSON; drop empty/whitespace. */
export function normalizeOptionalComment(target: { comment?: string; }): void {
    const comment = typeof target.comment === "string" ? target.comment.trim() : "";
    if (comment) {
        target.comment = comment;
    } else {
        delete target.comment;
    }
}
