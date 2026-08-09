import { type ChangeCounts, countChangeMarkers } from "../a-atoms/format-change-breakdown";
import { type SyncChangeDTO } from "@/bridge";

export const markerAddClasses = "text-emerald-600 dark:text-emerald-400";
export const markerModifyClasses = "text-yellow-600 dark:text-amber-300/70";
export const markerDeleteClasses = "text-red-600 dark:text-red-400";

export function markerColorClasses(marker: string): string {
    switch (marker) {
        case "A": return markerAddClasses;
        case "M": return markerModifyClasses;
        case "D": return markerDeleteClasses;
        default: return "";
    }
}

/** Colored "N added, N deleted, N modified" matching the A/M/D legend. */
export function ChangeBreakdown({ counts, changes }: { counts?: ChangeCounts; changes?: SyncChangeDTO[]; }) {
    const { added, deleted, modified } = counts ?? countChangeMarkers(changes);

    return (
        <>
            <span className={markerAddClasses}>{added}</span>
            {" added, "}
            <span className={markerDeleteClasses}>{deleted}</span>
            {" deleted, "}
            <span className={markerModifyClasses}>{modified}</span>
            {" modified"}
        </>
    );
}
