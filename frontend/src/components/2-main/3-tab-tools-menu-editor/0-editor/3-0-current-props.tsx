import { Folder, Minus, MousePointerClick, Terminal } from "lucide-react";
import { cn } from "@/utils/classnames";
import { nodeKind } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/a-menu-editor-atoms";
import { CommentField, Props_Item, Props_Submenu } from "@/components/2-main/3-tab-tools-menu-editor/0-editor/3-1-props";
import { useSelectedNode } from "@/components/2-main/3-tab-tools-menu-editor/a-atoms/use-selected-node";
import { ScrollArea } from "@/ui/shadcn/scroll-area";

export function ToolsProps() {
    const { uid, node } = useSelectedNode();

    if (!uid || !node) {
        return (
            <div className="min-h-0 h-full flex flex-col">
                <PanelHeader />
                <div className="flex-1 p-6 min-h-0 text-center text-muted-foreground flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <MousePointerClick className="size-6 opacity-50" />
                        <span>Select a menu item on the left to edit its properties.</span>
                    </div>
                </div>
            </div>
        );
    }

    const kind = nodeKind(node);

    return (
        <div className="min-h-0 h-full flex flex-col">
            <PanelHeader kind={kind} />

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 flex flex-col gap-3">
                    {kind === "separator" && (
                        <>
                            <p className="text-muted-foreground">
                                A separator draws a horizontal divider line in the menu.
                            </p>
                            <CommentField />
                        </>
                    )}

                    {kind === "submenu" && <Props_Submenu />}

                    {kind === "item" && <Props_Item />}
                </div>
            </ScrollArea>
        </div>
    );
}

function PanelHeader({ kind }: { kind?: "separator" | "submenu" | "item"; }) {
    const label = kind === "submenu" ? "Submenu" : kind === "separator" ? "Separator" : kind === "item" ? "Command" : "Properties";
    const Icon = kind === "submenu" ? Folder : kind === "separator" ? Minus : Terminal;

    return (
        <div className="px-3 py-1.5 border-b flex items-center gap-2">
            <span className="font-medium text-[0.7rem] text-muted-foreground uppercase tracking-wide">Properties</span>
            {kind && (
                <span className={cn("ml-auto px-1.5 py-0.5 text-[0.65rem] text-muted-foreground bg-muted rounded inline-flex items-center gap-1")}>
                    <Icon className="size-3" /> {label}
                </span>
            )}
        </div>
    );
}

