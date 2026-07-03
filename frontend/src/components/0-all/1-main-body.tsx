import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/shadcn/tabs";
import { getValidMainTab, MAIN_PAGES } from "./8-pages";

export function MainBody() {
    const settings = useSnapshot(appSettings);
    const activeTab = getValidMainTab(settings.mainTab);

    return (
        <div className="px-2 py-3 h-full min-h-0 flex flex-col 1gap-1 bg-red-500 ">
            <Tabs
                className="flex-1 min-h-0 flex flex-col gap-4"
                value={activeTab}
                onValueChange={(value) => { appSettings.mainTab = value; }}
            >
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
        </div>
    );
}
