import { type ReactNode, useEffect, useState } from "react";
import { classNames } from "@/utils/classnames";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { Label } from "@/ui/shadcn/label";
import { labelClasses } from "@/components/2-main/a-shared/props-shared-controls";

/** Collapses when `value` is empty; click the label to expand/collapse. */
export function CollapsibleOptionalField({ label, value, children, className }: { label: ReactNode; value: string; children: ReactNode; className?: string; }) {
    const hasValue = !!value.trim();
    const [open, setOpen] = useState(hasValue);

    useEffect(() => {
        setOpen(hasValue);
    }, [hasValue]);

    return (
        <div className={classNames("-mt-1 flex flex-col gap-0.5", className)}>
            <Label className={classNames(labelClasses, "select-none inline-flex items-center gap-px cursor-pointer")} onClick={() => setOpen((v) => !v)}>
                {label}
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
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
