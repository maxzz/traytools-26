// Windows .reg file support.
//
// Parsing accepts what regedit actually emits — both header versions, all the
// hex(N) type codes, backslash line continuations, and escaped strings. The
// backend handles the UTF-16LE encoding of the file itself, so this module only
// ever sees UTF-8 text with LF line endings.
//
// Serialization writes the desired values authored in the tree, grouped by key.

import {
    type RegGroup,
    type RegHive,
    type RegItem,
    type RegValue,
    type RegValueType,
    createItem,
    createValue,
    formatItemKeyPath,
    itemHasSubKey,
} from "./9-types-registry";

const REG_HEADER = "Windows Registry Editor Version 5.00";

/** hex(N) type codes as they appear in .reg files. */
const HEX_TYPE_CODES: Record<number, RegValueType> = {
    1: "REG_SZ",
    2: "REG_EXPAND_SZ",
    3: "REG_BINARY",
    4: "REG_DWORD",
    7: "REG_MULTI_SZ",
    11: "REG_QWORD",
};

const LONG_TO_SHORT_HIVE: Record<string, RegHive> = {
    HKEY_CURRENT_USER: "HKCU",
    HKEY_LOCAL_MACHINE: "HKLM",
    HKEY_CLASSES_ROOT: "HKCR",
    HKEY_USERS: "HKU",
    HKEY_CURRENT_CONFIG: "HKCC",
    HKCU: "HKCU",
    HKLM: "HKLM",
    HKCR: "HKCR",
    HKU: "HKU",
    HKCC: "HKCC",
};

export type ParsedRegFile = {
    group: RegGroup;
    /** Human-readable notes for entries that were recognized but skipped. */
    warnings: string[];
};

// ---------------------------------------------------------------------------
// Parsing

/**
 * Parse .reg text into a single group named `groupName`. Entries that cannot be
 * represented in the editor (key/value deletions, unknown type codes) are
 * skipped and reported in `warnings` rather than aborting the import.
 */
export function parseRegFile(text: string, groupName: string): ParsedRegFile {
    const warnings: string[] = [];
    const items: RegItem[] = [];
    // One key section becomes one item; a key repeated later in the file keeps
    // collecting values into the same item, matching how .reg files are merged.
    const byKey = new Map<string, RegItem>();

    let hive: RegHive | null = null;
    let keyPath = "";

    for (const line of joinContinuations(text)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(";")) {
            continue;
        }
        if (/^(Windows Registry Editor Version|REGEDIT4)/i.test(trimmed)) {
            continue;
        }

        // Key section: [HKEY_LOCAL_MACHINE\SOFTWARE\Foo] or [-HKEY...] to delete.
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            const inner = trimmed.slice(1, -1).trim();
            if (inner.startsWith("-")) {
                warnings.push(`Key deletion not supported: ${inner.slice(1)}`);
                hive = null;
                keyPath = "";
                continue;
            }
            const split = splitHive(inner);
            if (!split) {
                warnings.push(`Unknown registry root: ${inner}`);
                hive = null;
                keyPath = "";
                continue;
            }
            hive = split.hive;
            keyPath = split.keyPath;
            continue;
        }

        if (!hive) {
            continue;
        }

        const entry = parseValueLine(trimmed);
        if (!entry) {
            warnings.push(`Could not parse: ${truncate(trimmed)}`);
            continue;
        }
        if (entry.kind === "delete") {
            warnings.push(`Value deletion not supported: ${entry.valueName || "(Default)"}`);
            continue;
        }
        if (entry.kind === "unsupported") {
            warnings.push(entry.reason);
            continue;
        }

        const fullKey = keyPath ? `${hive}\\${keyPath}` : hive;
        let item = byKey.get(fullKey);
        if (!item) {
            item = createItem();
            item.keyPath = fullKey;
            item.values = [];
            item.requireElevated = hive !== "HKCU";
            byKey.set(fullKey, item);
            items.push(item);
        }

        const value = createValue();
        value.valueName = entry.valueName;
        value.valueType = entry.valueType;
        value.newValue = entry.value;
        item.values.push(value);
    }

    return {
        group: {
            name: groupName || "Imported",
            requireElevated: items.some((item) => item.requireElevated),
            items,
        },
        warnings,
    };
}

/**
 * Fold backslash-continued lines into single logical lines. regedit wraps long
 * hex payloads at ~76 columns with a trailing "\".
 */
function joinContinuations(text: string): string[] {
    const raw = text.replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];
    let pending: string | null = null;

    for (const line of raw) {
        const current: string = pending === null ? line : pending + line.trim();
        if (current.trimEnd().endsWith("\\") && !isQuotedStringLine(current)) {
            pending = current.trimEnd().slice(0, -1);
            continue;
        }
        pending = null;
        out.push(current);
    }
    if (pending !== null) {
        out.push(pending);
    }
    return out;
}

/**
 * A trailing backslash inside a quoted string value (a path like "C:\\dir\\")
 * is data, not a continuation. Continuations only occur in hex payloads, which
 * never contain quotes.
 */
function isQuotedStringLine(line: string): boolean {
    const eq = indexOfValueSeparator(line);
    if (eq < 0) {
        return false;
    }
    return line.slice(eq + 1).trimStart().startsWith("\"");
}

function splitHive(path: string): { hive: RegHive; keyPath: string; } | null {
    const normalized = path.replace(/\//g, "\\").replace(/^\\+/, "");
    const slash = normalized.indexOf("\\");
    const head = (slash < 0 ? normalized : normalized.slice(0, slash)).toUpperCase();
    const hive = LONG_TO_SHORT_HIVE[head];
    if (!hive) {
        return null;
    }
    return { hive, keyPath: slash < 0 ? "" : normalized.slice(slash + 1) };
}

type ValueEntry =
    | { kind: "value"; valueName: string; valueType: RegValueType; value: string; }
    | { kind: "delete"; valueName: string; }
    | { kind: "unsupported"; reason: string; };

/** Parse a `"Name"=<data>` or `@=<data>` line. */
function parseValueLine(line: string): ValueEntry | null {
    const eq = indexOfValueSeparator(line);
    if (eq < 0) {
        return null;
    }

    const namePart = line.slice(0, eq).trim();
    const dataPart = line.slice(eq + 1).trim();

    let valueName: string;
    if (namePart === "@") {
        valueName = "";
    } else if (namePart.startsWith("\"") && namePart.endsWith("\"") && namePart.length >= 2) {
        valueName = unescapeRegString(namePart.slice(1, -1));
    } else {
        return null;
    }

    if (dataPart === "-") {
        return { kind: "delete", valueName };
    }

    // "Name"="text"
    if (dataPart.startsWith("\"")) {
        const closing = dataPart.lastIndexOf("\"");
        if (closing <= 0) {
            return null;
        }
        return {
            kind: "value",
            valueName,
            valueType: "REG_SZ",
            value: unescapeRegString(dataPart.slice(1, closing)),
        };
    }

    // "Name"=dword:0000000a
    const dword = /^dword:\s*([0-9a-fA-F]+)$/.exec(dataPart);
    if (dword) {
        return {
            kind: "value",
            valueName,
            valueType: "REG_DWORD",
            value: String(parseInt(dword[1], 16)),
        };
    }

    // "Name"=hex:.. / hex(2):.. / hex(7):.. / hex(b):..
    const hex = /^hex(?:\(([0-9a-fA-F]+)\))?\s*:\s*(.*)$/.exec(dataPart);
    if (hex) {
        const code = hex[1] === undefined ? 3 : parseInt(hex[1], 16);
        const valueType = HEX_TYPE_CODES[code];
        if (!valueType) {
            return { kind: "unsupported", reason: `Unsupported value type hex(${hex[1]}) for "${valueName || "(Default)"}"` };
        }
        const bytes = parseHexBytes(hex[2]);
        return { kind: "value", valueName, valueType, value: valueFromHexBytes(valueType, bytes) };
    }

    return null;
}

/**
 * Index of the `=` that separates name from data, skipping any `=` inside the
 * quoted name.
 */
function indexOfValueSeparator(line: string): number {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "\\" && inQuotes) {
            i++;
            continue;
        }
        if (ch === "\"") {
            inQuotes = !inQuotes;
            continue;
        }
        if (ch === "=" && !inQuotes) {
            return i;
        }
    }
    return -1;
}

function parseHexBytes(text: string): number[] {
    const out: number[] = [];
    for (const part of text.split(",")) {
        const token = part.trim();
        if (!token) {
            continue;
        }
        const n = parseInt(token, 16);
        if (!Number.isNaN(n)) {
            out.push(n & 0xff);
        }
    }
    return out;
}

/** Convert a hex payload into the editor's canonical text for that type. */
function valueFromHexBytes(valueType: RegValueType, bytes: number[]): string {
    switch (valueType) {
        case "REG_SZ":
        case "REG_EXPAND_SZ":
            return trimTrailingNul(decodeUtf16Le(bytes));

        case "REG_MULTI_SZ":
            // A run of UTF-16 strings, each NUL-terminated, ended by an empty one.
            return dropTrailingEmpty(decodeUtf16Le(bytes).split("\0")).join("\n");

        case "REG_DWORD":
            return String(littleEndianNumber(bytes, 4));

        case "REG_QWORD":
            return littleEndianBigInt(bytes, 8).toString();

        default:
            return formatHexBytes(bytes);
    }
}

function trimTrailingNul(s: string): string {
    return s.replace(/\0+$/, "");
}

function dropTrailingEmpty(parts: string[]): string[] {
    const out = [...parts];
    while (out.length && out[out.length - 1] === "") {
        out.pop();
    }
    return out;
}

function decodeUtf16Le(bytes: number[]): string {
    let out = "";
    for (let i = 0; i + 1 < bytes.length; i += 2) {
        out += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
    }
    if (bytes.length % 2 === 1) {
        out += String.fromCharCode(bytes[bytes.length - 1]);
    }
    return out;
}

function littleEndianNumber(bytes: number[], size: number): number {
    let value = 0;
    for (let i = size - 1; i >= 0; i--) {
        value = value * 256 + (bytes[i] ?? 0);
    }
    return value;
}

function littleEndianBigInt(bytes: number[], size: number): bigint {
    let value = 0n;
    for (let i = size - 1; i >= 0; i--) {
        value = (value << 8n) | BigInt(bytes[i] ?? 0);
    }
    return value;
}

function unescapeRegString(s: string): string {
    return s.replace(/\\(.)/g, (_, ch: string) => {
        switch (ch) {
            case "n": return "\n";
            case "r": return "\r";
            case "t": return "\t";
            case "0": return "\0";
            default: return ch;
        }
    });
}

function truncate(s: string): string {
    return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

// ---------------------------------------------------------------------------
// Serialization

/**
 * Render keys as .reg text. Keys are emitted in first-seen order, and separate
 * items that name the same key share one section so the output reads like a
 * regedit export. The backend re-encodes to UTF-16LE with CRLF on write.
 */
export function buildRegFileText(items: readonly RegItem[]): string {
    const byKey = new Map<string, RegValue[]>();
    for (const item of items) {
        if (!itemHasSubKey(item)) {
            continue;
        }
        const key = formatItemKeyPath(item);
        const bucket = byKey.get(key);
        if (bucket) {
            bucket.push(...(item.values ?? []));
        } else {
            byKey.set(key, [...(item.values ?? [])]);
        }
    }

    const lines: string[] = [REG_HEADER, ""];
    for (const [key, values] of byKey) {
        lines.push(`[${key}]`);
        for (const value of values) {
            lines.push(formatValueLine(value));
        }
        lines.push("");
    }
    return lines.join("\n");
}

function formatValueLine(value: RegValue): string {
    const name = value.valueName.trim() ? `"${escapeRegString(value.valueName)}"` : "@";

    switch (value.valueType) {
        case "REG_SZ":
            return `${name}="${escapeRegString(value.newValue)}"`;

        case "REG_DWORD":
            return `${name}=dword:${toHex(parseNumericValue(value.newValue), 8)}`;

        case "REG_QWORD":
            return `${name}=hex(b):${formatHexBytes(bigIntToLeBytes(parseBigIntValue(value.newValue), 8))}`;

        case "REG_EXPAND_SZ":
            return `${name}=hex(2):${formatHexBytes(utf16LeBytes(value.newValue, true))}`;

        case "REG_MULTI_SZ":
            return `${name}=hex(7):${formatHexBytes(multiSzBytes(value.newValue))}`;

        case "REG_BINARY":
            return `${name}=hex:${formatHexBytes(parseBinaryText(value.newValue))}`;
    }
}

/** Accepts decimal or 0x-prefixed hex, matching the backend's parser. */
function parseNumericValue(text: string): number {
    const s = text.trim();
    if (!s) {
        return 0;
    }
    const n = /^0[xX]/.test(s) ? parseInt(s.slice(2), 16) : parseInt(s, 10);
    return Number.isNaN(n) ? 0 : n >>> 0;
}

function parseBigIntValue(text: string): bigint {
    const s = text.trim();
    if (!s) {
        return 0n;
    }
    try {
        // BigInt() understands both decimal and the 0x form.
        return BigInt(s);
    } catch {
        return 0n;
    }
}

export function parseBinaryText(text: string): number[] {
    const cleaned = text.replace(/[,\s:-]/g, "");
    const out: number[] = [];
    for (let i = 0; i + 1 < cleaned.length; i += 2) {
        const n = parseInt(cleaned.slice(i, i + 2), 16);
        out.push(Number.isNaN(n) ? 0 : n);
    }
    return out;
}

function utf16LeBytes(text: string, nulTerminated: boolean): number[] {
    const out: number[] = [];
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        out.push(code & 0xff, (code >> 8) & 0xff);
    }
    if (nulTerminated) {
        out.push(0, 0);
    }
    return out;
}

/** Each string NUL-terminated, then a final empty string to close the block. */
function multiSzBytes(text: string): number[] {
    const out: number[] = [];
    for (const s of dropTrailingEmpty(text.split("\n"))) {
        out.push(...utf16LeBytes(s, true));
    }
    out.push(0, 0);
    return out;
}

function bigIntToLeBytes(value: bigint, size: number): number[] {
    const out: number[] = [];
    let v = value;
    for (let i = 0; i < size; i++) {
        out.push(Number(v & 0xffn));
        v >>= 8n;
    }
    return out;
}

function toHex(value: number, width: number): string {
    return value.toString(16).padStart(width, "0");
}

function formatHexBytes(bytes: readonly number[]): string {
    return bytes.map((b) => (b & 0xff).toString(16).padStart(2, "0")).join(",");
}

function escapeRegString(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}
