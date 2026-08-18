/** Cap for each combo MRU list (newest first). */
export const COMBO_MRU_MAX = 10;

/** Named combo MRU lists. */
export const COMBO_MRU = {
    skipPatterns: "skipPatterns",
} as const;

export type ComboMruKey = (typeof COMBO_MRU)[keyof typeof COMBO_MRU];

/** Keep only non-empty unique strings, newest first, capped. */
export function parseMruList(raw: unknown, max: number = COMBO_MRU_MAX): string[] {
    if (!Array.isArray(raw)) {
        return [];
    }
    const out: string[] = [];
    for (const entry of raw) {
        if (typeof entry !== "string") {
            continue;
        }
        const value = entry.trim();
        if (!value || out.includes(value)) {
            continue;
        }
        out.push(value);
        if (out.length >= max) {
            break;
        }
    }
    return out;
}

/** Insert `value` at the front (or move it there). Empty values are ignored. */
export function pushMru(list: readonly string[], value: string, max: number = COMBO_MRU_MAX): string[] {
    const trimmed = value.trim();
    if (!trimmed) {
        return list.slice(0, max);
    }
    return [trimmed, ...list.filter((item) => item !== trimmed)].slice(0, max);
}

export function dropMru(list: readonly string[], value: string): string[] {
    return list.filter((item) => item !== value);
}
