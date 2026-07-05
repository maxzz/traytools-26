import { useSnapshot } from "valtio";
import { getValidMainTab, MAIN_PAGES } from "@/components/0-all/8-pages-array";
import { appSettings } from "@/store/1-ui-settings";
import { Button } from "@/ui/shadcn/button";
import { cn } from "@/utils/classnames";

export function MainTabButtons() {
    const settings = useSnapshot(appSettings);
    const activeTab = getValidMainTab(settings.mainTab);

    return (
        <div
            role="tablist"
            aria-label="Main pages"
            className="bg-muted text-muted-foreground rounded-lg p-[3px] h-8 w-fit inline-flex items-center justify-center"
        >
            {MAIN_PAGES.map(
                ({ id, label }) => {
                    const selected = id === activeTab;

                    return (
                        <Button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            variant={selected ? "outline" : "ghost"}
                            size="xs"
                            className={cn(
                                "h-[calc(100%-1px)] font-medium active:translate-y-0! transition-none cursor-pointer",
                                selected
                                    ? "bg-background text-foreground shadow-sm"
                                    : "border-transparent bg-transparent text-foreground/60 shadow-none hover:bg-transparent hover:text-foreground"
                            )}
                            onClick={() => { appSettings.mainTab = id; }}
                        >
                            {label}
                        </Button>
                    );
                }
            )}
        </div>
    );
}
