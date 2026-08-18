import { Button } from "@/ui/shadcn/button";
import { LabelAndField, InfoTooltip } from "@/components/2-main/a-shared/props-1-shared-controls";
import { type SyncOpItem } from "../a-atoms/9-types-sync";
import { openSkipListDialog } from "./a-skip-list-atoms";
import { DEFAULT_SKIP_PATTERNS, isDefaultSkipPatterns, skipListSummary } from "./b-skip-patterns";

export function SkipListField({ item }: { item: SyncOpItem; }) {
    const uid = item.uid;
    const patterns = item.skipPatterns ?? DEFAULT_SKIP_PATTERNS;
    const summary = skipListSummary(patterns);

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
                className="w-full h-auto min-h-7 px-2 py-1 justify-start font-normal font-mono whitespace-normal flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left"
                disabled={!uid}
                title={summary}
                onClick={() => uid && openSkipListDialog(uid, item.skipPatterns)}
            >
                <SkipListButtonItems patterns={patterns} />
            </Button>
        </LabelAndField>
    );
}

function SkipListButtonItems({ patterns }: { patterns: readonly string[]; }) {
    if (patterns.length === 0) {
        return <span>Nothing skipped</span>;
    }
    if (isDefaultSkipPatterns(patterns)) {
        return <span>Default: .git, node_modules</span>;
    }

    return patterns.map((pattern, index) => (
        <span key={`${index}:${pattern}`} className="flex max-w-full items-center gap-x-1.5">
            {index > 0 && (
                <span className="text-muted-foreground select-none" aria-hidden>
                    ·
                </span>
            )}
            <span className="min-w-0 break-all">{pattern}</span>
        </span>
    ));
}
