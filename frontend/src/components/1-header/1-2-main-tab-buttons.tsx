import { useSnapshot } from "valtio";
import { LayoutGroup, motion } from "motion/react";
import { getValidMainTab, MAIN_PAGES } from "@/components/0-all/8-pages-array";
import { appSettings } from "@/store/1-ui-settings";
import { Button } from "@/ui/shadcn/button";
import { cn } from "@/utils/classnames";

const TAB_OUTLINE_LAYOUT_ID = "main-tab-outline";

export function MainTabButtons() {
    const settings = useSnapshot(appSettings);
    const activeTab = getValidMainTab(settings.mainTab);

    return (
        <LayoutGroup id="main-tab-buttons">
            <div
                role="tablist"
                aria-label="Main pages"
                className="p-[3px] h-8 w-fit text-muted-foreground bg-muted rounded-lg inline-flex items-center justify-center"
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
                                variant="ghost"
                                size="xs"
                                className={cn(
                                    "relative h-[calc(100%-1px)] font-medium active:translate-y-0! transition-none cursor-pointer",
                                    selected
                                        ? "text-foreground"
                                        : "border-transparent bg-transparent text-foreground/60 shadow-none hover:bg-transparent hover:text-foreground"
                                )}
                                onClick={() => { appSettings.mainTab = id; }}
                            >
                                {selected && (
                                    <motion.div
                                        layoutId={TAB_OUTLINE_LAYOUT_ID}
                                        className="absolute inset-0 bg-background border border-border rounded-sm shadow-sm"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                                    />
                                )}
                                <span className="relative z-10">{label}</span>
                            </Button>
                        );
                    }
                )}
            </div>
        </LayoutGroup>
    );
}
