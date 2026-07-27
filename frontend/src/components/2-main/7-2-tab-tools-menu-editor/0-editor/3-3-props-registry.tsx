import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { patchSelectedNode } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/use-selected-node";
import { type CmdPlat } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/9-types-menu";
import {
    type NodeProps,
    ExecuteCommandButton,
    Field_Comment,
    Field_HotKey,
    Field_MenuName,
    Field_TypeIcon,
    LabelAndField,
    TriggerInfo,
} from "./3-4-props-shared-ui";

export function PropsFor_Registry({ node }: NodeProps) {
    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon node={node} />
            <ExecuteCommandButton node={node} />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_MenuName node={node} />
            <Field_HotKey node={node} />
        </div>
        <Field_Comment node={node} />

        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field_Reg_Path node={node} />
            <Field_Reg_Platform node={node} />
        </div>
    </>);
}

function Field_Reg_Path({ node }: NodeProps) {
    return (
        <LabelAndField label="Registry key">
            <Input
                className="h-7"
                value={node.cmdLine ?? ""}
                placeholder="HKLM\\SOFTWARE\\..."
                onChange={(e) => patchSelectedNode((n) => { n.cmdLine = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>
    );
}

function Field_Reg_Platform({ node }: NodeProps) {
    return (
        <LabelAndField
            label="Platform"
            labelHint={(
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <TriggerInfo aria-label="Platform help" />
                        </TooltipTrigger>

                        <TooltipContent side="top" className="max-w-64">
                            <div className="text-xs flex flex-col gap-1.5">
                                <p><strong>Current</strong> — use the default registry view for this OS.</p>
                                <p><strong>32-bit</strong> — prefer the 32-bit (WOW6432Node) registry view.</p>
                                <p><strong>64-bit</strong> — prefer the 64-bit registry view.</p>
                                <p><strong>Both</strong> — for keys that may exist in either view.</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        >
            <Select value={node.cmdPlat ?? "curr"} onValueChange={(v) => patchSelectedNode((n) => { if (v === "curr") { delete n.cmdPlat; } else { n.cmdPlat = v as CmdPlat; } })}>
                <SelectTrigger className="w-full h-7! min-w-20 text-[0.72rem]">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="curr">Current</SelectItem>
                    <SelectItem value="32">32-bit</SelectItem>
                    <SelectItem value="64">64-bit</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                </SelectContent>
            </Select>
        </LabelAndField>
    );
}
