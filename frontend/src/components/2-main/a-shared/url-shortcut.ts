/**
 * Parse Windows Internet Shortcut (.url) file text into its URL= target.
 * Handles UTF-8 and UTF-16 LE (with or without BOM).
 */
export function extractURLFromInternetShortcutText(content: string): string | null {
    let inSection = false;
    let sawSection = false;
    let fallback: string | null = null;

    for (const raw of content.split(/\n/)) {
        const line = raw.replace(/\r$/, "").trim();
        if (!line || line.startsWith(";")) {
            continue;
        }
        if (line.startsWith("[") && line.endsWith("]")) {
            inSection = line.toLowerCase() === "[internetshortcut]";
            if (inSection) {
                sawSection = true;
            }
            continue;
        }
        const eq = line.indexOf("=");
        if (eq < 0) {
            continue;
        }
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (key.toLowerCase() !== "url" || !val) {
            continue;
        }
        if (inSection || !sawSection) {
            return val;
        }
        if (!fallback) {
            fallback = val;
        }
    }
    return fallback;
}

/** Decode .url bytes (UTF-8 / UTF-16 LE) then extract URL=. */
export async function extractURLFromInternetShortcutFile(file: File): Promise<string | null> {
    const buf = await file.arrayBuffer();
    const data = new Uint8Array(buf);
    const text = decodeURLFileBytes(data);
    return extractURLFromInternetShortcutText(text);
}

function decodeURLFileBytes(data: Uint8Array): string {
    if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
        return utf16LEToString(data.subarray(2));
    }
    if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
        return new TextDecoder("utf-8").decode(data.subarray(3));
    }
    if (looksLikeUTF16LE(data)) {
        return utf16LEToString(data);
    }
    return new TextDecoder("utf-8").decode(data);
}

function looksLikeUTF16LE(data: Uint8Array): boolean {
    if (data.length < 4 || data.length % 2 !== 0) {
        return false;
    }
    const limit = Math.min(data.length / 2, 64);
    let nulHigh = 0;
    for (let i = 0; i < limit; i++) {
        if (data[i * 2 + 1] === 0) {
            nulHigh++;
        }
    }
    return nulHigh * 2 >= limit;
}

function utf16LEToString(data: Uint8Array): string {
    // Ensure even length for utf-16le.
    const even = data.byteLength % 2 === 0 ? data : data.subarray(0, data.byteLength - 1);
    return new TextDecoder("utf-16le").decode(even);
}
