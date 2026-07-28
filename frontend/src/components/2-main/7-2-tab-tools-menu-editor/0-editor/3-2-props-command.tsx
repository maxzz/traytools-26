import { type ReactNode } from "react";
import { classNames } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { PathInput } from "@/components/2-main/a-shared/path-input";
import { patchSelectedNode } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/use-selected-node";
import { effectiveRunElevated } from "@/components/2-main/7-2-tab-tools-menu-editor/a-atoms/9-types-menu";
import {
    type NodeProps,
    CollapsibleOptionalField,
    ExecuteCommandButton,
    Field_Comment,
    Field_HotKey,
    Field_MenuName,
    Field_TypeIcon,
    LabelAndField,
    labelClasses,
    TriggerInfo,
} from "./3-4-props-shared-ui";

export function PropsFor_Command({ node }: NodeProps) {
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

        <Field_Cmd_Path node={node} />
        <CommandPathFlags node={node} />
        <Field_Cmd_CliArgs node={node} />
    </>);
}

function Field_Cmd_Path({ node }: NodeProps) {
    return (
        <LabelAndField label="Command / path / URL">
            <PathInput
                value={node.cmdLine ?? ""}
                onChange={(path) => patchSelectedNode((n) => { n.cmdLine = path; })}
                kind="file"
                showReveal
            />
        </LabelAndField>
    );
}

function CommandPathFlags({ node }: NodeProps) {
    const isRelative = (node.cmdWhat ?? "rel") === "rel";

    return (
        <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <FlagSwitch
                label="Relative path"
                hint={(
                    <div className="text-xs grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">
                        <span className="font-semibold">Relative</span>
                        <span>Path relative to the folder containing tools.json.</span>
                        <span className="font-semibold">Absolute</span>
                        <span>Full path or program name, used as-is after env-var expansion.</span>
                        <span className="font-semibold">URL</span>
                        <span>Web link; use Absolute with a scheme:// address (e.g. https://…).</span>
                    </div>
                )}
                checked={isRelative}
                onCheckedChange={(v) => patchSelectedNode((n) => { n.cmdWhat = v ? "rel" : "abs"; })}
            />

            <FlagSwitch
                label="Run elevated"
                hint={<p className="text-xs">Launch this command with administrator privileges.</p>}
                checked={effectiveRunElevated(node)}
                onCheckedChange={(v) => patchSelectedNode((n) => { n.runElevated = v; })}
            />
        </div>
    );
}

function FlagSwitch({ label, hint, checked, onCheckedChange, }: { label: string; hint: ReactNode; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    return (
        <div className="inline-flex items-center gap-0.5">
            <Label className={classNames(labelClasses, "flex items-center gap-1 cursor-pointer")}>
                <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
                <span className="mt-0.5">{label}</span>
            </Label>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <TriggerInfo aria-label={`${label} help`} />
                    </TooltipTrigger>

                    <TooltipContent side="top" className="max-w-64">
                        {hint}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}

function Field_Cmd_CliArgs({ node }: NodeProps) {
    return (
        <CollapsibleOptionalField label="Arguments" value={node.cmdArgs ?? ""}>
            <Input
                className="h-7"
                value={node.cmdArgs ?? ""}
                onChange={(e) => patchSelectedNode((n) => {
                    const v = e.target.value;
                    if (v.trim()) { n.cmdArgs = v; } else { delete n.cmdArgs; }
                })}
                {...turnOffAutoComplete}
            />
        </CollapsibleOptionalField>
    );
}
