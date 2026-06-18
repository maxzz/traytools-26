import { TestConfirmationDialog, TestResizablePanels, TestLoginDialog } from "./xyz-demos";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/ui/shadcn/accordion";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";

export function MainBody() {
    const settings = useSnapshot(appSettings);

    const handleValueChange = (value: string[]) => {
        appSettings.expandedSections = value;
    };

    return (
        <main className="px-2 py-3 flex flex-col gap-4">
            <Accordion 
                type="multiple" 
                value={settings.expandedSections as string[]} 
                onValueChange={handleValueChange}
                className="gap-4"
            >
                {/* Section 1: Resizable Panels */}
                <AccordionItem value="resizable-panels" className="border rounded-xl bg-card shadow-xs overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline font-semibold text-sm border-b">
                        Resizable Panels Demo
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <TestResizablePanels className="w-full h-[400px] overflow-hidden" />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Dialog Buttons */}
            <div className="flex gap-2">
                <TestConfirmationDialog />
                <TestLoginDialog />
            </div>
        </main>
    );
}
