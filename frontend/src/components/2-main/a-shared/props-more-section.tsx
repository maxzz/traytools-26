import { type ReactNode } from "react";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { Label } from "@/ui/shadcn/label";
import { classNames } from "@/utils/classnames";
import { appSettings } from "@/store/1-ui-settings";
import { labelClasses } from "@/components/2-main/a-shared/props-field-ui";

/**
 * Collapsed-by-default section for secondary props (name, comment, …).
 * Open state is shared app-wide via `appSettings.propsMoreExpanded` (localStorage).
 */
export function PropsMoreSection({ children, className }: { children: ReactNode; className?: string; }) {
    const { propsMoreExpanded: open } = useSnapshot(appSettings);

    return (
        <div className={classNames("flex flex-col gap-0.5", className)}>
            <Label
                className={classNames(labelClasses, "w-fit select-none inline-flex items-center gap-px cursor-pointer")}
                onClick={() => { appSettings.propsMoreExpanded = !appSettings.propsMoreExpanded; }}
            >
                More
                <motion.span
                    className="shrink-0 relative size-2.5 text-muted-foreground inline-flex items-center justify-center"
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: 0.1, ease: "easeInOut" }}
                >
                    <ChevronRight className="size-2.5" />
                </motion.span>
            </Label>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        className="overflow-hidden"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        <div className="pt-2 flex flex-col gap-3">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
