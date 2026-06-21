import { ButtonThemeToggle } from "./8-btn-theme-toggle";
import { AppMenubar } from "./9-app-menubar";

export function Header() {
    return (
        <header className="px-3 py-2 border-b border-border bg-background flex items-center justify-between">
            <div className="flex items-center gap-3">
                <AppMenubar />
                <div>
                    tm-template-shadcn-26
                </div>
            </div>
            <div className="flex items-center gap-2">
                <ButtonThemeToggle />
            </div>
        </header>
    );
}
