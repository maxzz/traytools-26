import appIcon from "@/assets/icons/1x/asset-9.png";
import { envBuildVersion, envModifiedDate } from "@/utils";

export function PageWelcome() {
    return (
        <div className="flex-1 p-6 min-h-0 flex items-center justify-center">
            <div className="max-w-lg w-full text-center flex flex-col items-center gap-6">
                <img src={appIcon} alt="" className="size-24 drop-shadow-sm" />

                <div className="flex flex-col gap-2">
                    <p className="text-[0.7rem] text-muted-foreground/80">
                        <div>Version {envBuildVersion()}</div>
                        <div>{envModifiedDate()}</div>
                    </p>
                </div>
            </div>
        </div>
    );
}
