// Comment helpers kept free of React imports so config serializers can use them.

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
