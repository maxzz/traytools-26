import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { AppMenubar } from "./1-0-app-menubar";
import { MainTabs } from "./1-2-main-tabs";
import { UnloadHookNotice } from "./3-0-notice-unload-hook";
import { DpAgentToolbar } from "./4-dpagent-toolbar";
import { ElevatedIndicator } from "./5-elevated-indicator";
import { ButtonExit } from "./6-btn-exit";
import { ButtonSettings } from "./7-btn-settings";
import { ButtonThemeToggle } from "./8-btn-theme-toggle";
import { ExitSelfIntegrity } from "./4-dpagent-toolbar/3-exit-self-integrity";

export function Header() {
    const { showDpAgentToolbar } = useSnapshot(appSettings);

    return (
        <header className="px-3 py-1 bg-background border-b border-border flex items-center justify-between">
            <div className="min-w-0 flex items-center gap-3">
                <AppMenubar />

                <div className="relative min-w-0">
                    <MainTabs />
                    <UnloadHookNotice className="absolute inset-y-0 left-0 flex items-center z-10" />
                </div>
            </div>

            <div className="flex items-center gap-1">
                <ButtonSettings />
                <ButtonThemeToggle />
                {showDpAgentToolbar
                    ? (
                        <DpAgentToolbar className="ml-1" />
                    ) : (
                        <ElevatedIndicator />
                    )
                }
                {!showDpAgentToolbar && <ButtonExit />}
                <ExitSelfIntegrity />
            </div>
        </header>
    );
}
