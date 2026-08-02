import { type CSSProperties, useEffect } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Toaster } from "@/ui/shadcn/sonner";
import { UISymbolDefs } from "@/ui/icons";
import { appSettings } from "@/store/1-ui-settings";
import { settingsBus } from "@/bridge/groups/settings";
import { cacheWindowSizeKey, windowSizeKeyAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { Header } from "../1-header/0-all-header/0-all-header";
import { Section3_Footer } from "../3-footer";
import { AllDialogs } from "./9-globals";
import { getValidTabComponent } from "./8-pages-array";

export function App() {
    const [windowSizeKey, setWindowSizeKey] = useAtom(windowSizeKeyAtom);
    const { showFooter } = useSnapshot(appSettings);
    const appSize = windowSizeKey === "mini" ? "mini" : "normal";
    const isMini = appSize === "mini";

    useEffect(
        () => {
            let cancelled = false;
            settingsBus.getWindowSizeKey()
                .then((key) => {
                    if (!cancelled && key) {
                        cacheWindowSizeKey(key);
                        setWindowSizeKey(key);
                    }
                })
                .catch(console.error);
            return () => { cancelled = true; };
        },
        [setWindowSizeKey]);

    return (<>
        <UISymbolDefs />
        <Toaster />
        <AllDialogs />

        <main
            // Mini: content-sized shell. content-start prevents CSS grid from stretching
            // auto rows into leftover window space (which previously inflated height).
            className="@container h-screen text-xs bg-background grid grid-rows-[auto_1fr_auto] mini:h-auto mini:min-h-0 mini:overflow-hidden mini:content-start mini:items-start"
            data-app-size={appSize}
            style={{
                "--app-size": appSize,
                ...(isMini
                    ? { gridTemplateRows: showFooter ? "auto auto" : "auto" }
                    : undefined),
            } as CSSProperties}
        >
            <Header />

            <div className="h-full min-h-0 bg-app-background/10 flex flex-col mini:hidden">
                <MainBody />
            </div>

            <Section3_Footer />
        </main>
    </>);
}

function MainBody() {
    const { mainTab } = useSnapshot(appSettings);
    const Page = getValidTabComponent(mainTab);
    return (
        <Page />
    );
}
