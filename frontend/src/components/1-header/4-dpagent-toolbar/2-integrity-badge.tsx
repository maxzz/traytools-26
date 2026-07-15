import { classNames } from "@/utils";
import { type IntegrityLevel } from "@/bridge";
import { integrityGlyph, integrityTitle } from "./a-dpagent-atoms";

export function IntegrityBadge({ level, subject, className }: { level: IntegrityLevel | undefined; subject: string; className?: string; }) {
    const glyph = integrityGlyph(level);
    const isHigh = level === "high";
    const isUnknown = !level || level === "na" || level === "undetected";

    return (
        <span
            className={classNames(
                "px-0.5 min-w-4 h-5 font-bold text-[11px] border rounded-sm select-none inline-flex items-center justify-center leading-none",
                isHigh && "text-red-600 border-red-500/50 bg-red-500/10",
                !isHigh && !isUnknown && "text-amber-700 border-amber-500/40 bg-amber-500/10",
                isUnknown && "text-muted-foreground border-border bg-muted/40",
                className,
            )}
            title={integrityTitle(level, subject)}
            aria-label={integrityTitle(level, subject)}
        >
            {glyph}
        </span>
    );
}
