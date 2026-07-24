/**
 * Return `desired` if unused among `existing`; otherwise `base N` with the next
 * free N (e.g. "Name" / "Name 1" present → "Name 2").
 */
export function nextNumberedName(desired: string, existing: Iterable<string>): string {
    const trimmed = desired.trim() || "New";
    const names = [...existing];
    if (!names.includes(trimmed)) {
        return trimmed;
    }

    const base = trimmed.replace(/\s+\d+$/, "").trim() || trimmed;
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}(?:\\s+(\\d+))?$`);

    let max = 0;
    for (const name of names) {
        const m = re.exec(name);
        if (!m) {
            continue;
        }
        max = Math.max(max, m[1] ? Number(m[1]) : 0);
    }

    return `${base} ${max + 1}`;
}
