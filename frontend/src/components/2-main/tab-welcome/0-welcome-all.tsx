import appIcon from "@/assets/icons/1x/appicon.png";
import { appSettings } from "@/store/1-ui-settings";
import { refreshWindowTree } from "@/store/4-windows-tree";
import { envBuildVersion } from "@/utils";
import { Button } from "@/ui/shadcn/button";

// Welcome Screen tab. Landing view with app branding and shortcuts into the
// primary tools exposed from the View menu.

function openView(tab: "trace" | "windows-tree") {
    appSettings.mainTab = tab;
    if (tab === "windows-tree") {
        void refreshWindowTree();
    }
}

export function PageWelcome() {
    return (
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
            <div className="max-w-lg w-full flex flex-col items-center gap-6 text-center">
                <img src={appIcon} alt="" className="size-24 drop-shadow-sm" />

                <div className="flex flex-col gap-2">
                    <h1 className="text-lg font-semibold tracking-tight">
                        TrayTools
                    </h1>

                    <p className="text-xs text-muted-foreground">
                        Windows inspection utilities — trace live output from traced processes,
                        browse the window hierarchy, and run tools from the tray.
                    </p>

                    <p className="text-[0.7rem] text-muted-foreground/80">
                        Version {envBuildVersion()}
                    </p>
                </div>

                <div className="w-full grid gap-3 sm:grid-cols-2">
                    <Button
                        variant="outline"
                        className="h-auto py-3 flex-col gap-1 whitespace-normal"
                        onClick={() => openView("trace")}
                    >
                        <span className="font-semibold">Trace Manager</span>
                        <span className="text-[0.7rem] font-normal text-muted-foreground">
                            Stream and filter trace calls by process
                        </span>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-auto py-3 flex-col gap-1 whitespace-normal"
                        onClick={() => openView("windows-tree")}
                    >
                        <span className="font-semibold">Windows Tree</span>
                        <span className="text-[0.7rem] font-normal text-muted-foreground">
                            Inspect HWNDs, styles, and window properties
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
