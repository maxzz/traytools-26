import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Textarea } from "@/ui/shadcn/textarea";
import { CollapsibleOptionalField } from "@/components/2-main/a-shared/collapsible-optional-field";

export { applyComment, normalizeOptionalComment } from "./field-comment-utils";

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