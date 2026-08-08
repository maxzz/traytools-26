import { type SyncChangeDTO } from "@/bridge";

export function formatChangeBreakdown(changes: SyncChangeDTO[] | undefined): string {
    let added = 0;
    let deleted = 0;
    let modified = 0;
    for (const change of changes ?? []) {
        switch ((change.marker || "").slice(0, 1).toUpperCase()) {
            case "A": added++; break;
            case "D": deleted++; break;
            case "M": modified++; break;
        }
    }
    return `${added} added, ${deleted} deleted, ${modified} modified`;
}
