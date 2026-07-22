import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { AppMenubar } from "./1-0-app-menubar";
import { MainTabs } from "./1-2-main-tabs";
import { UnloadHookNotice } from "../3-send-unload-msg-notice/3-0-notice-unload-hook";
import { DpAgentToolbar } from "../4-dpagent-toolbar";
import { ButtonHome } from "./2-0-btn-home";
import { ButtonStayOnTop } from "./2-1-btn-stay-on-top";
import { ButtonSettings } from "./2-2-btn-settings";
import { ButtonThemeToggle } from "./2-3-btn-theme-toggle";
import { BadgeSelfIntegrity, ButtonExit } from "./5-btn-exit-self-integrity";

export function Header() {
    const { showMainTabs, showThemeToggle } = useSnapshot(appSettings);

    return (
        <header className="px-3 py-1 bg-background border-b border-border flex items-center justify-between">
            <div className="min-w-0 flex items-center gap-3">
                <AppMenubar />

                <div className="relative min-w-0">
                    {showMainTabs && <MainTabs />}
                    <UnloadHookNotice className={showMainTabs ? "absolute inset-y-0 left-0 flex items-center z-10" : "flex items-center"} />
                </div>
            </div>

            <div className="flex items-center gap-1">
                <ButtonStayOnTop />
                <ButtonSettings />
                {!showMainTabs && <ButtonHome />}
                {showThemeToggle && <ButtonThemeToggle />}
                <DpAgentToolbar className="ml-1" />
                <ButtonExit />
                <BadgeSelfIntegrity />
            </div>
        </header>
    );
}
