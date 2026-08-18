import { Button } from "@/ui/shadcn/button";
import { LabelAndField, InfoTooltip } from "@/components/2-main/a-shared/props-1-shared-controls";
import { type SyncOpItem } from "../a-atoms/9-types-sync";
import { openSkipListDialog } from "./a-skip-list-atoms";
import { DEFAULT_SKIP_PATTERNS, isDefaultSkipPatterns, skipListSummary, skipPatternDisplayLabel } from "./b-skip-patterns";

export function SkipListField({ item }: { item: SyncOpItem; }) {
    const uid = item.uid;
    const patterns = item.skipPatterns ?? DEFAULT_SKIP_PATTERNS;
    const summary = skipListSummary(patterns);

    return (
        <LabelAndField
            label="Skip list"
            labelHint={(
                <InfoTooltip label="Skip list help" contentClasses="max-w-64 font-light rounded-md">
                    Regular expressions for files and folders ignored during scanning and synchronization.
                    <br />
                    Defaults are 💠.git and 💠node_modules.
                    <br />
                    An empty list skips nothing.
                </InfoTooltip>
            )}
        >
            <Button
                className="w-full h-auto min-h-7 px-2 py-1 justify-start font-normal whitespace-normal flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-left active:not-aria-[haspopup]:scale-100"
                variant="outline"
                size="xs"
                onClick={() => uid && openSkipListDialog(uid, item.skipPatterns)}
                disabled={!uid}
                title={summary}
                type="button"
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
        return <span>Default: skip only 💠.git, 💠node_modules</span>;
    }

    return patterns.map(
        (pattern, index) => (
            <span key={`${index}:${pattern}`} className="flex max-w-full items-center">
                <span className="select-none" aria-hidden>
                    💠
                </span>
                <span className="min-w-0 break-all">
                    {skipPatternDisplayLabel(pattern)}
                </span>
            </span>
        )
    );
}
