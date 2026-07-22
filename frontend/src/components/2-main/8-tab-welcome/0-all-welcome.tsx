import appIcon from "@/assets/icons/1x/asset-9.png";
import { envBuildVersion, envModifiedDate } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { WELCOME_VIEW_PAGES } from "@/components/0-all/8-pages-array";

export function PageWelcome() {
    return (
        <div className="flex-1 p-6 min-h-0 flex items-center justify-center">
            <div className="max-w-lg w-full text-center flex flex-col items-center gap-1">
                <img src={appIcon} alt="" className="size-24 drop-shadow-lg" />

                <div className="flex flex-col gap-1">
                    Welcome to traytools!
                    <PagesList />
                    <div className="text-[0.6rem] text-muted-foreground/80 flex gap-2">
                        <div>Version: {envBuildVersion()}</div>
                        <div>Updated: {envModifiedDate()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PagesList() {
    return (
        <nav className="ml-auto my-2 flex flex-col items-end gap-0.5" aria-label="Pages">
            {WELCOME_VIEW_PAGES.map(
                ({ id, label }) => (
                    <button
                        className="text-xs text-primary hover:text-primary underline-offset-4 hover:underline cursor-pointer"
                        onClick={() => { appSettings.mainTab = id; }}
                        type="button"
                        key={id}
                    >
                        {label}
                    </button>
                )
            )}
        </nav>
    );
}
