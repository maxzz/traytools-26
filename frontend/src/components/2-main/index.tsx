import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/shadcn/tabs";
import { getValidMainTab, MAIN_PAGES } from "./1-pages";

export function MainBody() {
    const settings = useSnapshot(appSettings);
    const activeTab = getValidMainTab(settings.mainTab);

    return (
        <div className="px-2 py-3 flex flex-col gap-4 min-h-0">
            <Tabs
                value={activeTab}
                onValueChange={(value) => {
                    appSettings.mainTab = value;
                }}
                className="flex flex-col gap-4"
            >
                <TabsList>
                    {MAIN_PAGES.map(({ id, label }) => (
                        <TabsTrigger key={id} value={id}>
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {MAIN_PAGES.map(({ id, Page }) => (
                    <TabsContent key={id} value={id} className="flex flex-col gap-4">
                        <Page />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
