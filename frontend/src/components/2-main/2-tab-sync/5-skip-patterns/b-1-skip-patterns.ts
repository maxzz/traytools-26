/** Default skip list for Check and Sync. Matched as regular expressions. */
export const DEFAULT_SKIP_PATTERNS: readonly string[] = ["^\\.git$", "^node_modules$"];

export function defaultSkipPatterns(): string[] {
    return [...DEFAULT_SKIP_PATTERNS];
}

function toUnknownArray(raw: unknown): unknown[] | undefined {
    if (raw == null) {
        return undefined;
    }
    if (Array.isArray(raw)) {
        return raw;
    }
    if (typeof raw === "object" && typeof (raw as { length?: unknown; }).length === "number") {
        try {
            return Array.from(raw as ArrayLike<unknown>);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

/** Trim strings and drop blanks. A non-array becomes an empty list (skip nothing). */
export function sanitizeSkipPatterns(raw: unknown): string[] {
    const list = toUnknownArray(raw);
    if (!list) {
        return [];
    }
    const out: string[] = [];
    for (const entry of list) {
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
 * JSON load:
 * - field missing / null / non-array → built-in `.git` / `node_modules` skip list
 * - `[]` → skip nothing (copy everything)
 * - any other array → that list
 */
export function skipPatternsFromUnknown(raw: unknown, present: boolean): string[] {
    if (!present || raw == null || toUnknownArray(raw) === undefined) {
        return defaultSkipPatterns();
    }
    return sanitizeSkipPatterns(raw);
}

/**
 * JSON save:
 * - built-in default list (same two patterns, any order) → omit the field (`undefined`)
 * - `[]` → write `[]` (copy everything)
 * - any other list → write as-is
 */
export function skipPatternsToJson(raw: unknown): string[] | undefined {
    const list = toUnknownArray(raw);
    if (list === undefined) {
        return undefined;
    }
    const cleaned = sanitizeSkipPatterns(list);
    if (isDefaultSkipPatterns(cleaned)) {
        return undefined;
    }
    return cleaned;
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

/** True when `patterns` is exactly the built-in .git / node_modules pair (order does not matter). */
export function isDefaultSkipPatterns(patterns: readonly string[] | undefined): boolean {
    if (!patterns || patterns.length !== DEFAULT_SKIP_PATTERNS.length) {
        return false;
    }
    const want = new Set<string>(DEFAULT_SKIP_PATTERNS);
    if (new Set(patterns).size !== want.size) {
        return false;
    }
    return patterns.every((p) => want.has(p));
}

/** Patterns sent to Check/Sync. Missing on the item means the built-in defaults. `[]` means skip nothing. */
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
