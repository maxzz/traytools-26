import { type SyncChangeDTO } from "@/bridge";

export type ChangeCounts = {
    added: number;
    deleted: number;
    modified: number;
};

export function countChangeMarkers(changes: SyncChangeDTO[] | undefined): ChangeCounts {
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
    return { added, deleted, modified };
}
