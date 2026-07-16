import { useEffect, useState } from 'react';
import { Toaster } from '@/ui/shadcn/sonner';
import { Header } from '../1-header/0-all-header/0-all-header';
import { Section3_Footer } from '../3-footer';
import { AllDialogs } from './9-globals';
import { useSnapshot } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { WindowSetTitle } from '../../../wailsjs/runtime/runtime';
import { settingsBus } from '@/bridge/groups/settings';
import { formatMainWindowTitle, getValidMainTab, MAIN_PAGES } from './8-pages-array';
import { UISymbolDefs } from '@/ui/icons';

export function App() {
    return (<>
        <UISymbolDefs />
        <Toaster />
        <AllDialogs />

        <main className="h-screen text-xs font-condensed bg-background grid grid-rows-[auto_1fr_auto]">
            <Header />

            <div className="h-full min-h-0 bg-sky-900/10 flex flex-col">
                <MainBody />
            </div>

            <Section3_Footer />
        </main>
    </>);
}

function MainBody() {
    const { mainTab } = useSnapshot(appSettings);
    const activeTab = getValidMainTab(mainTab);
    const [isElevated, setIsElevated] = useState<boolean | null>(null);

    useEffect(
        () => {
            settingsBus.isElevated().then(setIsElevated).catch(console.error);
        },
        []);

    useEffect(
        () => {
            if (isElevated === null) {
                return;
            }

            const title = formatMainWindowTitle(activeTab, isElevated);
            document.title = title;
            try {
                WindowSetTitle(title);
            } catch {
                // Wails runtime unavailable (e.g. Vite-only browser dev).
            }
        },
        [activeTab, isElevated]);

    const Page = MAIN_PAGES.find((page) => page.id === activeTab)?.Page ?? MAIN_PAGES[0].Page;

    return (
        <Page />
    );
}
