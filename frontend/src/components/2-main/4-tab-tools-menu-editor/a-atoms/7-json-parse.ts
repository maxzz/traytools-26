import type { ToolsConfig } from "./9-types-menu";

// ---------------------------------------------------------------------------
// JSONC parsing (mirrors the backend jsonc stripper) so raw tools.json files
// with inline (//) and block (/* */) comments and trailing commas parse on the frontend too.

export function parseToolsJsonc(text: string): ToolsConfig {
    const parsed = JSON.parse(stripJsonComments(text)) as Partial<ToolsConfig>;
    if (!parsed || typeof parsed !== "object" || !parsed.menu) {
        throw new Error("tools.json must contain a top-level \"menu\" object");
    }
    return parsed as ToolsConfig;
}

function stripJsonComments(src: string): string {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < src.length; i++) {
        const c = src[i];

        if (inString) {
            out += c;
            if (escaped) {
                escaped = false;
            } else if (c === "\\") {
                escaped = true;
            } else if (c === '"') {
                inString = false;
            }
            continue;
        }

        if (c === '"') {
            inString = true;
            out += c;
            continue;
        }

        if (c === "/" && src[i + 1] === "/") {
            while (i < src.length && src[i] !== "\n") {
                i++;
            }
            if (i < src.length) {
                out += "\n";
            }
            continue;
        }

        if (c === "/" && src[i + 1] === "*") {
            i += 2;
            while (i + 1 < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
                i++;
            }
            i++; // land on '/', loop's i++ moves past it
            continue;
        }

        out += c;
    }

    return removeTrailingCommas(out);
}

function removeTrailingCommas(src: string): string {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < src.length; i++) {
        const c = src[i];

        if (inString) {
            out += c;
            if (escaped) {
                escaped = false;
            } else if (c === "\\") {
                escaped = true;
            } else if (c === '"') {
                inString = false;
            }
            continue;
        }

        if (c === '"') {
            inString = true;
            out += c;
            continue;
        }

        if (c === ",") {
            let j = i + 1;
            while (j < src.length && /\s/.test(src[j])) {
                j++;
            }
            if (j < src.length && (src[j] === "}" || src[j] === "]")) {
                continue; // drop this comma
            }
        }

        out += c;
    }

    return out;
}

/**
 * Pull inline (//) and block (/* * /) comment lines that appear inside the root object before the "menu" property.
 * These are re-inserted when the file is saved so a loaded tools.json keeps its header comments.
 */
export function extractRootComments(raw: string): string {
    const menuMatch = raw.match(/"menu"\s*:\s*\{/);
    if (!menuMatch || menuMatch.index === undefined) {
        return "";
    }
    const menuIdx = menuMatch.index;
    const braceIdx = raw.indexOf("{");
    if (braceIdx < 0 || braceIdx >= menuIdx) {
        return "";
    }

    const lines = raw.slice(braceIdx + 1, menuIdx).split("\n");
    const kept: string[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "") {
            if (kept.length > 0) {
                kept.push(line);
            }
            continue;
        }
        if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed === "*/" || trimmed.endsWith("*/")) {
            kept.push(line);
        }
    }
    while (kept.length > 0 && kept[kept.length - 1].trim() === "") {
        kept.pop();
    }
    return kept.join("\n");
}
