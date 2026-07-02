import { AppMenubar } from "./1-0-app-menubar";
import { ElevatedIndicator } from "./5-elevated-indicator";
import { ButtonThemeToggle } from "./8-btn-theme-toggle";

export function Header() {
    return (
        <header className="px-3 py-2 bg-background border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
                <AppMenubar />
            </div>

            <div className="flex items-center gap-1">
                <ElevatedIndicator />
                <ButtonThemeToggle />
            </div>
        </header>
    );
}
