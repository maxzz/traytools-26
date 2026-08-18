import { describe, expect, it } from "vitest";
import {
    DEFAULT_SKIP_PATTERNS,
    isDefaultSkipPatterns,
    resolvedSkipPatterns,
    sanitizeSkipPatterns,
    skipPatternError,
    skipPatternsFromUnknown,
    skipListSummary,
} from "./b-skip-patterns";

describe("skipPatternsFromUnknown", () => {
    it("uses defaults when the field is missing", () => {
        expect(skipPatternsFromUnknown(undefined, false)).toEqual([...DEFAULT_SKIP_PATTERNS]);
    });

    it("keeps an explicit empty list", () => {
        expect(skipPatternsFromUnknown([], true)).toEqual([]);
    });

    it("uses defaults for a non-array payload", () => {
        expect(skipPatternsFromUnknown("nope", true)).toEqual([...DEFAULT_SKIP_PATTERNS]);
    });
});

describe("skipPatternError", () => {
    it("accepts empty and default patterns", () => {
        expect(skipPatternError("")).toBeNull();
        expect(skipPatternError("^\\.git$")).toBeNull();
        expect(skipPatternError("^node_modules$")).toBeNull();
    });

    it("rejects an unclosed group", () => {
        expect(skipPatternError("(")).toBeTruthy();
    });
});

describe("resolvedSkipPatterns", () => {
    it("falls back to defaults when undefined", () => {
        expect(resolvedSkipPatterns(undefined)).toEqual([...DEFAULT_SKIP_PATTERNS]);
    });

    it("preserves an empty list", () => {
        expect(resolvedSkipPatterns([])).toEqual([]);
    });
});

describe("isDefaultSkipPatterns", () => {
    it("matches the built-in list", () => {
        expect(isDefaultSkipPatterns([...DEFAULT_SKIP_PATTERNS])).toBe(true);
        expect(isDefaultSkipPatterns([])).toBe(false);
        expect(isDefaultSkipPatterns(["^build$"])).toBe(false);
    });
});

describe("skipListSummary", () => {
    it("describes an empty list", () => {
        expect(skipListSummary([])).toBe("Nothing skipped");
    });

    it("describes the built-in defaults", () => {
        expect(skipListSummary([...DEFAULT_SKIP_PATTERNS])).toBe("Default: .git, node_modules");
    });
});

describe("sanitizeSkipPatterns", () => {
    it("drops non-strings", () => {
        expect(sanitizeSkipPatterns(["ok", 1, null, "  x  "])).toEqual(["ok", "x"]);
    });
});
