import { motion } from "motion/react";
import { useSnapshot } from "valtio";
import { LoadStatusNotice } from "@/components/2-main/a-shared/tree-3-status-notice";
import { windowTreeStore } from "./a-windows-tree-calls";

const rowMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.16, ease: "easeOut" as const } },
    transition: { duration: 0.22, ease: "easeOut" as const },
};

/**
 * Drop-in for the Windows-tab status bar idle row: Ready, Loading..., or the
 * load error. Reads Valtio so it can be embedded without local useState.
 */
export function WindowTreeLoadNotice({ className }: { className?: string; }) {
    const { loading, error } = useSnapshot(windowTreeStore);
    const errorLabel = error ? `Failed to load window tree: ${error}` : null;

    return (
        <motion.div className="absolute inset-0 px-2 min-w-0 flex items-center" {...rowMotion}>
            <LoadStatusNotice
                loading={loading}
                error={errorLabel}
                loadingLabel="Loading..."
                idleLabel="Ready"
                className={className}
            />
        </motion.div>
    );
}
