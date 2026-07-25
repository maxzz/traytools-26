import { MousePointerClick } from "lucide-react";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { useSelectedNode } from "../a-atoms/use-selected-node";
import { PropsFor_Group, PropsFor_Item, PropsFor_Root } from "./3-1-props";

export function Panel_Props() {
    const selected = useSelectedNode();

    return (
        <div className="min-h-0 h-full flex flex-col">
            <ScrollArea className="flex-1 min-h-0" fullHeight>
                <div className="p-3 h-full flex flex-col gap-3">
                    {!selected
                        ? <NoSelectionView />
                        : selected.kind === "root"
                            ? <PropsFor_Root />
                            : selected.kind === "group"
                                ? <PropsFor_Group group={selected.group} />
                                : <PropsFor_Item item={selected.item} />
                    }
                </div>
            </ScrollArea>
        </div>
    );
}

function NoSelectionView() {
    return (
        <div className="flex-1 p-6 h-full min-h-0 text-center text-muted-foreground flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <MousePointerClick className="size-6 opacity-50" />
                <span>
                    Select a group or copy item on the left to edit its properties.
                </span>
            </div>
        </div>
    );
}
