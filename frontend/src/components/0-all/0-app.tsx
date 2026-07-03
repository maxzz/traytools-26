import { Toaster } from '@/ui/shadcn/sonner';
import { Header } from '../1-header';
import { Section3_Footer } from '../3-footer';
import { AllDialogs } from './9-globals';
import { useSnapshot } from 'valtio';
import { appSettings } from '@/store/1-ui-settings';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/shadcn/tabs';
import { getValidMainTab, MAIN_PAGES } from './8-pages-array';

export function App() {
    return (<>
        <Toaster />
        <AllDialogs />

        <main className="h-screen text-xs bg-background grid grid-rows-[auto_1fr_auto]">
            <Header />

            <div className="px-2 py-3 h-full min-h-0 bg-red-500 flex flex-col">
                <MainBody />
            </div>
            
            <Section3_Footer />
        </main>
    </>);
}

function MainBody() {
    const settings = useSnapshot(appSettings);
    const activeTab = getValidMainTab(settings.mainTab);

    return (
        <Tabs className="flex-1 min-h-0 flex flex-col gap-4" value={activeTab} onValueChange={(value) => { appSettings.mainTab = value; }}>
            <TabsList>
                    {MAIN_PAGES.map(
                        ({ id, label }) => (
                            <TabsTrigger key={id} value={id}>
                                {label}
                            </TabsTrigger>
                        )
                    )}
                </TabsList>

            {MAIN_PAGES.map(
                ({ id, Page }) => (
                    <TabsContent key={id} value={id} className="min-h-0 flex flex-col gap-4">
                        <Page />
                    </TabsContent>
                )
            )}
        </Tabs>
    );
}
