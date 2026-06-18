// @ts-check
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const EXT = [".tsx", ".jsx"];
const FIX = process.argv.includes("--fix");

const VARIANT = 11;
const TRANSITION = 12;
const BORDER = 13;
const ROUNDING = 14;
const SHADOW = 15;
const TRUNCATE_OVERFLOW = 16;
const CHILDREN = 17;
const END = 18;
const UNKNOWN = 999;

const GROUP_NAMES = [
    "position anchor",
    "position offsets",
    "self & group",
    "element",
    "margin & padding",
    "width & height",
    "display",
    "text size",
    "font",
    "text color",
    "background & fill color",
    "variant modifiers",
    "transition",
    "border",
    "rounding",
    "shadow",
    "truncate & overflow",
    "children",
    "end",
];

const TEXT_SIZES = new Set([
    "text-xs", "text-sm", "text-base", "text-lg", "text-xl",
    "text-2xl", "text-3xl", "text-4xl", "text-5xl", "text-6xl", "text-7xl", "text-8xl", "text-9xl",
]);

const CLASS_PATTERNS = [
    /className\s*=\s*"([^"]+)"/g,
    /className\s*=\s*'([^']+)'/g,
    /className\s*=\s*\{`([^`]+)`\}/g,
    /className\s*=\s*\{\s*["'`]([^"'`]+)["'`]\s*\}/g,
    /class\s*=\s*"([^"]+)"/g,
    /cn\(\s*["'`]([^"'`]+)["'`]/g,
    /classNames\(\s*["'`]([^"'`]+)["'`]/g,
];

function baseToken(token) {
    if (/^group\/[\w-]+$/.test(token)) {
        return token;
    }
    const parts = token.split(":");
    return parts[parts.length - 1];
}

function hasVariantPrefix(token) {
    if (/^group\/[\w-]+$/.test(token)) {
        return false;
    }
    return token.includes(":");
}

function classify(token) {
    const base = baseToken(token);
    const variant = hasVariantPrefix(token);

    // 19 — end (always last)
    if (/^(?:cursor-|pointer-events)/.test(base) || base === "pointer-events-none" || /^z-/.test(base)) {
        return END;
    }

    // 1 — position anchor
    if (/^(?:relative|absolute|fixed|sticky|static)/.test(base)) {
        return variant ? VARIANT : 0;
    }

    // 2 — position offsets (immediately after anchor)
    if (/^(?:inset-|top-|right-|bottom-|left-)/.test(base)) {
        return variant ? VARIANT : 1;
    }

    // 2 — self & group
    if (/^self-/.test(base) || base === "group" || /^group\//.test(base)) {
        return 2;
    }

    // 13 — transition (including variant-prefixed)
    if (/^(?:transition|duration|animate)/.test(base)) {
        return TRANSITION;
    }

    // 17 — truncate & overflow
    if (base === "truncate" || base === "text-ellipsis" || /^overflow-/.test(base)) {
        return TRUNCATE_OVERFLOW;
    }

    // 18 — children (grid before flex in same group)
    if (
        /^grid(?:-|$)/.test(base) ||
        base === "grid" ||
        /^inline-grid/.test(base) ||
        /^flex(?:-|$)/.test(base) ||
        base === "flex" ||
        /^inline-flex/.test(base) ||
        /^gap-/.test(base) ||
        /^items-/.test(base) ||
        /^justify-/.test(base) ||
        /^content-/.test(base) ||
        /^place-/.test(base) ||
        /^order-/.test(base) ||
        /^col-/.test(base) ||
        /^row-/.test(base) ||
        /^space-[xy]-/.test(base) ||
        /^list-/.test(base)
    ) {
        return variant ? VARIANT : CHILDREN;
    }

    // 4 — element
    if (
        /^(?:shrink|grow)$/.test(base) ||
        /^shrink-/.test(base) ||
        /^grow-/.test(base) ||
        /^basis-/.test(base) ||
        /^select-/.test(base) ||
        /^whitespace-/.test(base) ||
        base === "compress-zero"
    ) {
        return 3;
    }

    // 5 — margin & padding (unprefixed only; prefixed → variant modifiers)
    if (
        !variant &&
        /^(?:m-|mx-|my-|mt-|mr-|mb-|ml-|p-|px-|py-|pt-|pr-|pb-|pl-)/.test(base)
    ) {
        return 4;
    }

    // 6 — width & height
    if (/^(?:w-|h-|min-w-|max-w-|min-h-|max-h-|size-|aspect-)/.test(base)) {
        return 5;
    }

    // 7 — display
    if (["block", "inline", "hidden", "visible", "isolate"].includes(base)) {
        return variant ? VARIANT : 6;
    }

    // 8 — text size
    if (TEXT_SIZES.has(base)) {
        return 7;
    }

    // 9 — font
    if (/^font-/.test(base)) {
        return 8;
    }

    // 14–16 — border, rounding, shadow (variant-prefixed → modifiers)
    if (/^(?:border|outline-|ring-|divide-)/.test(base) && !/^rounded/.test(base)) {
        return variant ? VARIANT : BORDER;
    }
    if (/^rounded/.test(base)) {
        return variant ? VARIANT : ROUNDING;
    }
    if (/^shadow/.test(base)) {
        return variant ? VARIANT : SHADOW;
    }

    // 10 — text color (unprefixed only)
    if (!variant && /^text-/.test(base) && !TEXT_SIZES.has(base)) {
        return 9;
    }

    // 11 — background & fill color (unprefixed only)
    if (
        !variant &&
        /^(?:bg-|fill-|stroke-|from-|to-|via-|opacity-|accent-|caret-|decoration-)/.test(base)
    ) {
        return 10;
    }

    // 12 — variant modifiers (remaining prefixed utilities)
    if (variant) {
        return VARIANT;
    }

    return -1;
}

function sortClassString(value) {
    const tokens = value.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) {
        return value;
    }

    const withMeta = tokens.map((token, index) => ({
        token,
        sortGroup: classify(token),
        index,
    }));

    withMeta.sort((a, b) => {
        const ga = a.sortGroup >= 0 ? a.sortGroup : UNKNOWN;
        const gb = b.sortGroup >= 0 ? b.sortGroup : UNKNOWN;
        if (ga !== gb) {
            return ga - gb;
        }
        return a.index - b.index;
    });

    return withMeta.map((x) => x.token).join(" ");
}

function extractClassStrings(content) {
    const results = [];
    const seen = new Set();

    for (const pattern of CLASS_PATTERNS) {
        const re = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = re.exec(content))) {
            const key = `${match.index}:${match[0].length}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            results.push({
                value: match[1],
                index: match.index,
                length: match[0].length,
                full: match[0],
            });
        }
    }

    return results;
}

function checkClassString(value) {
    const tokens = value.split(/\s+/).filter(Boolean);
    const classified = tokens
        .map((token) => ({ token, group: classify(token) }))
        .filter((x) => x.group >= 0);

    const violations = [];
    let maxGroup = -1;

    for (const { token, group } of classified) {
        if (group < maxGroup) {
            violations.push({
                token,
                group: GROUP_NAMES[group],
                after: GROUP_NAMES[maxGroup],
            });
        }
        maxGroup = Math.max(maxGroup, group);
    }

    return violations;
}

function walk(dir, files = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (!["node_modules", "dist", ".git"].includes(entry)) walk(full, files);
        } else if (EXT.some((e) => entry.endsWith(e))) {
            files.push(full);
        }
    }
    return files;
}

function applyFixes(file, matches) {
    const toApply = matches
        .map(({ index, length, full, value }) => {
            if (checkClassString(value).length === 0) {
                return null;
            }
            const fixed = sortClassString(value);
            if (fixed === value) {
                return null;
            }
            return {
                index,
                length,
                replacement: full.replace(value, fixed),
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.index - a.index);

    if (!toApply.length) {
        return 0;
    }

    let content = readFileSync(file, "utf8");
    for (const { index, length, replacement } of toApply) {
        content = content.slice(0, index) + replacement + content.slice(index + length);
    }
    writeFileSync(file, content, "utf8");
    return toApply.length;
}

function scanForViolations(filePaths) {
    const violations = [];

    for (const file of filePaths) {
        const content = readFileSync(file, "utf8");
        const rel = relative(ROOT, file).replace(/\\/g, "/");

        for (const { value, index } of extractClassStrings(content)) {
            const classViolations = checkClassString(value);
            if (!classViolations.length) continue;

            const line = content.slice(0, index).split("\n").length;
            violations.push({ file: rel, line, value, violations: classViolations });
        }
    }

    return violations;
}

function printViolations(violations) {
    const byFile = new Map();
    for (const v of violations) {
        if (!byFile.has(v.file)) byFile.set(v.file, []);
        byFile.get(v.file).push(v);
    }

    console.log(`Scanned ${files.length} files`);
    console.log(`Found ${violations.length} class strings with order violations in ${byFile.size} files\n`);

    for (const [file, items] of [...byFile.entries()].sort()) {
        console.log(file);
        for (const item of items) {
            console.log(`  L${item.line}: ${item.value.slice(0, 100)}${item.value.length > 100 ? "..." : ""}`);
            for (const v of item.violations) {
                console.log(`    - "${v.token}" (${v.group}) appears after ${v.after}`);
            }
        }
        console.log();
    }
}

const files = walk(join(ROOT, "src"));
let fixedCount = 0;

if (FIX) {
    for (const file of files) {
        const content = readFileSync(file, "utf8");
        fixedCount += applyFixes(file, extractClassStrings(content));
    }

    console.log(`Scanned ${files.length} files`);
    console.log(`Fixed ${fixedCount} class string${fixedCount === 1 ? "" : "s"}\n`);

    if (fixedCount > 0) {
        console.log("Re-checking after fix...\n");
        const remaining = scanForViolations(files);
        if (remaining.length > 0) {
            printViolations(remaining);
            process.exit(1);
        }
    }

    process.exit(0);
}

const allViolations = scanForViolations(files);

console.log(`Scanned ${files.length} files`);
printViolations(allViolations);

if (allViolations.length > 0) {
    console.log("Run with --fix to reorder classes automatically.\n");
}

process.exit(allViolations.length > 0 ? 1 : 0);
