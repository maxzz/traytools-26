import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/ui/shadcn/accordion";
import { TestConfirmationDialog } from "./01-test-confirmation-dialog";
import { TestResizablePanels } from "./02-test-resizable-panels";
import { TestLoginDialog } from "./03-test-login-dialog";

export function Page_XYZdemos() {
    const settings = useSnapshot(appSettings);

    const handleValueChange = (value: string[]) => {
        appSettings.expandedSections = value;
    };

    return (
        <>
            <Accordion 
                type="multiple" 
                value={settings.expandedSections as string[]} 
                onValueChange={handleValueChange}
                className="gap-4"
            >
                {/* Section 1: Resizable Panels */}
                <AccordionItem value="resizable-panels" className="bg-card border rounded-xl shadow-xs overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline border-b">
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
        </>
    );
}
