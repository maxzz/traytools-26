import { type CSSProperties } from "react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Toaster } from "@/ui/shadcn/sonner";
import { UISymbolDefs } from "@/ui/icons";
import { appSettings } from "@/store/1-ui-settings";
import { windowSizeKeyAtom } from "@/components/4-dialogs/8-3-settings/a-settings-atoms";
import { Header } from "../1-header/0-all-header/0-all-header";
import { Section3_Footer } from "../3-footer";
import { AllDialogs } from "./9-globals";
import { getValidTabComponent } from "./8-pages-array";

export function App() {
    const windowSizeKey = useAtomValue(windowSizeKeyAtom);
    const appSize = windowSizeKey === "mini" ? "mini" : "normal";

    return (<>
        <UISymbolDefs />
        <Toaster />
        <AllDialogs />

        <main
            className="@container h-screen text-xs bg-background grid grid-rows-[auto_1fr_auto] mini:grid-rows-[auto]"
            style={{ "--app-size": appSize } as CSSProperties}
        >
            <Header />

            <div className="h-full min-h-0 bg-app-background/10 flex flex-col mini:hidden">
                <MainBody />
            </div>

            <Section3_Footer className="mini:hidden" />
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
