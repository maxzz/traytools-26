import { Toaster } from '@/ui/shadcn/sonner';
import { Header } from '../1-header/0-all-header/0-all-header';
import { Section3_Footer } from '../3-footer';
import { AllDialogs } from './9-globals';
import { useSnapshot } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { getValidTabComponent } from './8-pages-array';
import { UISymbolDefs } from '@/ui/icons';

export function App() {
    //useTitleUpdate(); // No need title update so far. Let's keep it for future reference.
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
    const Page = getValidTabComponent(mainTab);
    return (
        <Page />
    );
}

// function useTitleUpdate() {
//     const { mainTab } = useSnapshot(appSettings);
//     const activeTab = getValidMainTab(mainTab);
//     const isElevated = useAtomValue(appIsElevatedAtom);
//     useEffect(
//         () => {
//             if (isElevated === null) {
//                 return;
//             }
//             const title = formatMainWindowTitle(activeTab, isElevated);
//             document.title = title;
//             try {
//                 WindowSetTitle(title);
//             } catch {
//                 // Wails runtime unavailable (e.g. Vite-only browser dev).
//             }
//         },
//         [activeTab, isElevated]);
// }
