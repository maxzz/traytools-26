import { useSnapshot } from "valtio";
import { LoadStatusNotice } from "@/components/2-main/a-shared/tree-3-flash-notice";
import { windowTreeStore } from "./a-windows-tree-calls";

/** Window-tree load/error badge. Reads Valtio so callers can drop it on a row or overlay. */
export function WindowTreeLoadNotice({ className }: { className?: string; }) {
    const { loading, error } = useSnapshot(windowTreeStore);
    const errorLabel = error ? `Failed to load window tree: ${error}` : null;

    return (
        <LoadStatusNotice
            loading={loading}
            error={errorLabel}
            loadingLabel="Loading..."
            className={className}
        />
    );
}
