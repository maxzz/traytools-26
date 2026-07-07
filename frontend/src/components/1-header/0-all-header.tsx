import { AppMenubar } from "./1-0-app-menubar";
import { MainTabButtons } from "./1-2-main-tab-buttons";
import { ElevatedIndicator } from "./5-elevated-indicator";
import { ButtonExit } from "./6-btn-exit";
import { ButtonThemeToggle } from "./8-btn-theme-toggle";

export function Header() {
    return (
        <header className="px-3 py-2 bg-background border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <AppMenubar />
                <MainTabButtons />
            </div>

            <div className="flex items-center gap-1">
                <ElevatedIndicator />
                <ButtonExit />
                <ButtonThemeToggle />
            </div>
        </header>
    );
}
