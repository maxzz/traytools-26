import { defaultRunElevated, type ToolMenuItem, type ToolsConfig } from "./9-types-menu";
import type { ToolsEditorStore } from "./1-menu-local-storage";

// Serialize the config object to JSON (4-space indent). Does not include the
// root-object JSONC header comments — use buildToolsFileText for the full file.
export function serializeToolsConfig(config: ToolsConfig): string {
    return JSON.stringify(config, jsonReplacer, 4);
}

// Build the full tools.json text, optionally preserving root-object JSONC
// comments loaded from the on-disk file.
export function buildToolsFileText(config: ToolsConfig, rootComments = ""): string {
    const body = serializeToolsConfig(config);
    if (!rootComments.trim()) {
        return normalizeFileText(body);
    }

    const newline = body.indexOf("\n");
    if (newline < 0) {
        return normalizeFileText(body);
    }

    const rest = body.slice(newline + 1);
    const header = rootComments.endsWith("\n") ? rootComments : `${rootComments}\n`;
    return normalizeFileText(`{\n${header}${rest}`);
}

// Compare the live editor tree against the last loaded/saved baseline. When no
// tools.json exists on disk yet, the editor is always considered modified.
export function computeDirty(store: ToolsEditorStore): boolean {
    if (!store.fileExists) {
        return true;
    }
    return buildToolsFileText(store.config, store.rootComments) !== store.baseline;
}

export function syncDirty(store: ToolsEditorStore): void {
    const dirty = computeDirty(store);
    if (store.dirty !== dirty) {
        store.dirty = dirty;
    }
}

// ---------------------------------------------------------------------------
// JSONC parsing (mirrors the backend jsonc stripper) so raw tools.json files
// with // and /* */ comments and trailing commas parse on the frontend too.

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

export function parseToolsJsonc(text: string): ToolsConfig {
    const parsed = JSON.parse(stripJsonComments(text)) as Partial<ToolsConfig>;
    if (!parsed || typeof parsed !== "object" || !parsed.menu) {
        throw new Error("tools.json must contain a top-level \"menu\" object");
    }
    return parsed as ToolsConfig;
}

// Pull // and /* */ comment lines that appear inside the root object before the
// "menu" property. These are re-inserted when the file is saved so a loaded
// tools.json keeps its header comments.
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

function normalizeFileText(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

function jsonReplacer(this: ToolMenuItem, key: string, value: unknown) {
    if (key === "uid") {
        return undefined;
    }
    if (key === "runElevated") {
        return value === defaultRunElevated(this) ? undefined : value;
    }
    if (key === "comment") {
        return typeof value === "string" && value.trim() === "" ? undefined : value;
    }
    return value;
}
