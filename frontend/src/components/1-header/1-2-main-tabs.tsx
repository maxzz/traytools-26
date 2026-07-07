import { type ComponentProps } from "react";
import { useSnapshot } from "valtio";
import { LayoutGroup, motion } from "motion/react";
import { classNames } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { Button } from "@/ui/shadcn/button";
import { getValidMainTab, MAIN_PAGES } from "@/components/0-all/8-pages-array";

export function MainTabs({ className, ...rest }: ComponentProps<"div">) {
    const settings = useSnapshot(appSettings);
    const activeTab = getValidMainTab(settings.mainTab);

    return (
        <LayoutGroup id="main-tab-buttons">
            <div className={classNames("p-0.75 w-fit h-8 text-muted-foreground bg-muted rounded-lg hidden md:flex items-center", className)} role="tablist" aria-label="Main pages" {...rest}>
                {MAIN_PAGES.map(
                    ({ id, label }) => {
                        const selected = id === activeTab;
                        return (
                            <Button
                                className={classNames("relative h-[calc(100%-1px)] font-medium active:translate-y-0! transition-none cursor-pointer",
                                    selected ? "text-foreground" : "border-transparent bg-transparent text-foreground/60 shadow-none hover:bg-transparent hover:text-foreground"
                                )}
                                variant="ghost" size="xs" type="button" role="tab" aria-selected={selected} key={id} onClick={() => { appSettings.mainTab = id; }}
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

const TAB_OUTLINE_LAYOUT_ID = "main-tab-outline";
