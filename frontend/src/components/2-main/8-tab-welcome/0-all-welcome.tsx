import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { motion, useAnimate } from "motion/react";
import appIcon from "@/assets/icons/1x/asset-9.png";
import { envBuildVersion, envModifiedDate } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { WELCOME_VIEW_PAGES } from "@/components/0-all/8-pages-array";
import { welcomeLogoPulse } from "./s-logo-pulse";

export function PageWelcome() {
    return (
        <div className="flex-1 p-6 min-h-0 flex items-center justify-center">
            <div className="max-w-lg w-full text-center flex flex-col items-center gap-1">
                <WelcomeLogo />

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
                        className="text-[0.65rem] text-primary hover:text-primary underline-offset-4 hover:underline cursor-pointer"
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

function WelcomeLogo() {
    const [scope, animate] = useAnimate();
    const { tick } = useSnapshot(welcomeLogoPulse);

    useEffect(
        () => {
            if (tick === 0) {
                return;
            }

            // Anticipation pause → rapid squash → hold → exaggerated pop back to rest.
            void animate([
                [scope.current, { scaleX: -1 }, { duration: 0.01, ease: [0.55, 0, 1, 1] }],
                [scope.current, { scale: 0.2 }, { duration: 0.1, ease: [0.55, 0, 1, 1] }],
                [scope.current, { scale: 2.14 }, { delay: 0.18, duration: 0.12, ease: [0, 0, 0.2, 1] }],
                [scope.current, { scale: 1 }, { duration: 0.08, ease: "easeIn" }],
                [scope.current, { scaleX: 1 }, { delay: 1.4, duration: 0.01, ease: [0.55, 0, 1, 1] }],
                [scope.current, { scaleX: -1 }, { duration: 0.01, ease: [0.55, 0, 1, 1] }],
                [scope.current, { scaleX: 1 }, { duration: 0.01, ease: [0.55, 0, 1, 1] }],
            ]);
        },
        [tick, animate]);

    return (
        <motion.img
            ref={scope}
            src={appIcon}
            alt=""
            className="size-24 drop-shadow-lg"
        />
    );
}
