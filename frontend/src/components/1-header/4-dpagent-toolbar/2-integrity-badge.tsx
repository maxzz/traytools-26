import { classNames } from "@/utils";
import { type IntegrityLevel } from "@/bridge";

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
            title={integrityAriaLabel(level, subject)}
            aria-label={integrityAriaLabel(level, subject)}
        >
            {glyph}
        </span>
    );
}

/** Short glyph shown in the toolbar integrity slots (legacy UAC sprite cells). */
function integrityGlyph(level: IntegrityLevel | undefined): string {
    switch (level) {
        case "high":
            return "H";
        case "medium":
            return "M";
        case "mediumplus":
            return "M+";
        case "low":
            return "L";
        case "undetected":
            return "?";
        case "na":
        default:
            return "?";
    }
}

function integrityAriaLabel(level: IntegrityLevel | undefined, subject: string): string {
    switch (level) {
        case "high":
            return `${subject}: High integrity`;
        case "medium":
            return `${subject}: Medium integrity`;
        case "mediumplus":
            return `${subject}: Medium-plus integrity`;
        case "low":
            return `${subject}: Low integrity`;
        case "undetected":
            return `${subject}: Integrity undetected`;
        case "na":
            return `${subject}: N/A`;
        default:
            return `${subject}: Unknown`;
    }
}
