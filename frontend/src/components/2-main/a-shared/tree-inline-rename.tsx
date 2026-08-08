import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Input } from "@/ui/shadcn/input";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";

/**
 * Label cell: double-click text or trailing empty space to rename.
 * Right `w-5` gutter is reserved for row-end action icons and is not a rename target.
 */
export function TreeRowLabel({ renaming, title, onBeginRename, trailing, editor, children }: {
    renaming: boolean;
    title?: string;
    onBeginRename: () => void;
    trailing?: ReactNode;
    editor: ReactNode;
    children: ReactNode;
}) {
    return (
        <span className="flex-1 relative min-w-0 flex items-center" title={renaming ? undefined : title}>
            {renaming ? (
                editor
            ) : (
                <span
                    className="flex-1 min-w-0 self-stretch flex items-center gap-1"
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        onBeginRename();
                    }}
                >
                    <span className="min-w-0 truncate">{children}</span>
                    {trailing}
                </span>
            )}
            <span className="shrink-0 w-5" aria-hidden />
        </span>
    );
}

/** Compact in-place name editor for tree labels (Enter commits, Escape cancels). */
export function TreeInlineName({ value, placeholder, onCommit, onCancel }: {
    value: string;
    placeholder?: string;
    onCommit: (next: string) => void;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const skipCommitRef = useRef(false);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) {
            return;
        }
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
    }, []);

    function finishCommit() {
        if (skipCommitRef.current) {
            return;
        }
        skipCommitRef.current = true;
        onCommit(draft);
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.preventDefault();
            finishCommit();
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            skipCommitRef.current = true;
            onCancel();
        }
    }

    return (
        <Input
            ref={inputRef}
            className="h-4.5 flex-1 min-w-0 -mx-1 px-1 py-0 bg-background dark:bg-background border-none rounded-none"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            onBlur={finishCommit}
            {...turnOffAutoComplete}
        />
    );
}
