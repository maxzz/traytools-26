import { ElevatedIndicator } from "./7-elevated-indicator";
import { ButtonThemeToggle } from "./8-btn-theme-toggle";
import { AppMenubar } from "./9-app-menubar";

export function Header() {
    return (
        <header className="px-3 py-2 bg-background border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
                <AppMenubar />
                <div>
                    tm-template-shadcn-26
                </div>
            </div>
            <div className="flex items-center gap-1">
                <ElevatedIndicator />
                <ButtonThemeToggle />
            </div>
        </header>
    );
}
