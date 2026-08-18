import { Button } from "@/ui/shadcn/button";
import { LabelAndField, InfoTooltip } from "@/components/2-main/a-shared/props-1-shared-controls";
import { type SyncOpItem } from "../a-atoms/9-types-sync";
import { openSkipListDialog } from "./a-skip-list-atoms";
import { skipListSummary } from "./b-skip-patterns";

export function SkipListField({ item }: { item: SyncOpItem; }) {
    const uid = item.uid;
    const summary = skipListSummary(item.skipPatterns);

    return (
        <LabelAndField
            label="Skip list"
            labelHint={(
                <InfoTooltip label="Skip list help" contentClasses="max-w-64">
                    Regular expressions for files and folders ignored during Check and Sync.
                    Defaults are .git and node_modules. An empty list skips nothing.
                </InfoTooltip>
            )}
        >
            <Button
                type="button"
                variant="outline"
                size="xs"
                className="w-full h-7 px-2 justify-start font-normal font-mono truncate"
                disabled={!uid}
                title={summary}
                onClick={() => uid && openSkipListDialog(uid, item.skipPatterns)}
            >
                {summary}
            </Button>
        </LabelAndField>
    );
}
