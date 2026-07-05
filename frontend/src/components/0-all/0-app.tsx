import { useEffect } from 'react';
import { Toaster } from '@/ui/shadcn/sonner';
import { Header } from '../1-header';
import { Section3_Footer } from '../3-footer';
import { AllDialogs } from './9-globals';
import { useSnapshot } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { WindowSetTitle } from '../../../wailsjs/runtime/runtime';
import { formatMainWindowTitle, getValidMainTab, MAIN_PAGES } from './8-pages-array';

export function App() {
    return (<>
        <Toaster />
        <AllDialogs />

        <main className="h-screen text-xs bg-background grid grid-rows-[auto_1fr_auto]">
            <Header />

            <div className="px-2 py-3 h-full min-h-0 bg-sky-900/10 flex flex-col">
                <MainBody />
            </div>

            <Section3_Footer />
        </main>
    </>);
}

function MainBody() {
    const settings = useSnapshot(appSettings);
    const activeTab = getValidMainTab(settings.mainTab);

    useEffect(() => {
        const title = formatMainWindowTitle(activeTab);
        document.title = title;
        try {
            WindowSetTitle(title);
        } catch {
            // Wails runtime unavailable (e.g. Vite-only browser dev).
        }
    }, [activeTab]);

    const Page = MAIN_PAGES.find((page) => page.id === activeTab)?.Page ?? MAIN_PAGES[0].Page;

    return (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
            <Page />
        </div>
    );
}
