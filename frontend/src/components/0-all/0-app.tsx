import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { Toaster } from '@/ui/shadcn/sonner';
import { Header } from '../1-header/0-all-header/0-all-header';
import { Section3_Footer } from '../3-footer';
import { AllDialogs } from './9-globals';
import { useSnapshot } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { WindowSetTitle } from '../../../wailsjs/runtime/runtime';
import { appIsElevatedAtom } from '@/components/4-dialogs/8-3-settings/a-settings-atoms';
import { formatMainWindowTitle, getValidMainTab, MAIN_PAGES } from './8-pages-array';
import { UISymbolDefs } from '@/ui/icons';

export function App() {
    return (<>
        <UISymbolDefs />
        <Toaster />
        <AllDialogs />

        <main className="h-screen text-xs bg-background grid grid-rows-[auto_1fr_auto]">
            <Header />

            <div className="h-full min-h-0 bg-app-background/10 flex flex-col">
                <MainBody />
            </div>

            <Section3_Footer />
        </main>
    </>);
}

function MainBody() {
    const { mainTab } = useSnapshot(appSettings);
    const activeTab = getValidMainTab(mainTab);
    const isElevated = useAtomValue(appIsElevatedAtom);

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
