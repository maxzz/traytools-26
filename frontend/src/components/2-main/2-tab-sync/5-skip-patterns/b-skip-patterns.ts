/** Default skip list for Check and Sync. Matched as regular expressions. */
export const DEFAULT_SKIP_PATTERNS: readonly string[] = ["^\\.git$", "^node_modules$"];

export function defaultSkipPatterns(): string[] {
    return [...DEFAULT_SKIP_PATTERNS];
}

/** Trim strings and drop blanks. A non-array becomes an empty list (skip nothing). */
export function sanitizeSkipPatterns(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    const out: string[] = [];
    for (const entry of raw) {
        if (typeof entry !== "string") {
            continue;
        }
        const trimmed = entry.trim();
        if (trimmed) {
            out.push(trimmed);
        }
    }
    return out;
}

/**
 * JSON field rules: missing / null → built-in defaults; present array (including []) → sanitized.
 */
export function skipPatternsFromUnknown(raw: unknown, present: boolean): string[] {
    if (!present || raw == null || !Array.isArray(raw)) {
        return defaultSkipPatterns();
    }
    return sanitizeSkipPatterns(raw);
}

export function skipPatternsEqual(a: readonly string[] | undefined, b: readonly string[]): boolean {
    const left = a ?? [];
    if (left.length !== b.length) {
        return false;
    }
    for (let i = 0; i < left.length; i++) {
        if (left[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

export function isDefaultSkipPatterns(patterns: readonly string[] | undefined): boolean {
    return skipPatternsEqual(patterns, DEFAULT_SKIP_PATTERNS);
}

/** Patterns sent to the backend. Missing on the item means the built-in defaults. */
export function resolvedSkipPatterns(patterns: readonly string[] | undefined): string[] {
    if (patterns == null) {
        return defaultSkipPatterns();
    }
    return sanitizeSkipPatterns(patterns);
}

/** Empty patterns are allowed (dropped on save). Non-empty must compile as a JS RegExp. */
export function skipPatternError(pattern: string): string | null {
    const trimmed = pattern.trim();
    if (!trimmed) {
        return null;
    }
    try {
        new RegExp(trimmed, "i");
        return null;
    } catch (e) {
        return e instanceof Error ? e.message : "Invalid regular expression";
    }
}

export function skipListSummary(patterns: readonly string[] | undefined): string {
    const list = patterns ?? DEFAULT_SKIP_PATTERNS;
    if (list.length === 0) {
        return "Nothing skipped";
    }
    if (isDefaultSkipPatterns(list)) {
        return "Default: .git, node_modules";
    }
    return list.join("  ·  ");
}
