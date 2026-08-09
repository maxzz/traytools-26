import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { CollapsibleOptionalField } from "@/components/2-main/a-shared/props-2-collapsible-optional-field";
import { PathInput, isProbablyURL } from "@/components/2-main/a-shared/props-5-path-input";
import { CheckboxAndTooltip, InfoTooltip, LabelAndField } from "@/components/2-main/a-shared/props-1-shared-controls";
import { PropsMoreSection } from "@/components/2-main/a-shared/props-4-more-section";
import { patchSelectedNode } from "../a-atoms/use-selected-node";
import { effectiveRunElevated } from "../a-atoms/9-types-menu";
import { type NodeProps, ExecuteCommandButton, Field_Comment, Field_HotKey, Field_MenuName, Field_TypeIcon } from "./3-4-props-shared-ui";

export function PropsFor_Command({ node }: NodeProps) {
    return (<>
        <div className="flex items-center justify-between gap-2">
            <Field_TypeIcon node={node} />
            <ExecuteCommandButton node={node} />
        </div>

        <Field_Cmd_Path node={node} />
        <CommandPathFlags node={node} />
        <Field_Cmd_CliArgs node={node} />

        <PropsMoreSection>
            <div className="grid grid-cols-[1fr_auto] gap-2">
                <Field_MenuName node={node} />
                <Field_HotKey node={node} />
            </div>
            <Field_Comment node={node} />
        </PropsMoreSection>
    </>);
}

function Field_Cmd_Path({ node }: NodeProps) {
    return (
        <LabelAndField
            label="Command"
            labelHint={(
                <InfoTooltip label="Command / path / URL help">
                    <div className="text-xs font-light flex flex-col gap-1.5">
                        <p className="font-medium">Command</p>
                        <p>Program, file, folder, or web address to open when this menu item is selected.</p>
                        <p className="font-medium">Path</p>
                        <p>Full path or program name. Prefer forward slashes (C:/…); backslashes also work. Used as-is after env-var expansion.</p>
                        <p className="font-medium">URL</p>
                        <p>Web link; use Absolute with a scheme:// address (e.g. https://…). You can drag a link from the browser or drop a .url shortcut file into this field.</p>
                        <p className="font-medium">Environment variables</p>
                        <p>Environment variables such as <strong>%AppData%</strong> are expanded. Use the Relative path option for paths under the tools.json folder.</p>
                    </div>
                </InfoTooltip>
            )}
        >
            <PathInput
                value={node.cmdLine ?? ""}
                onChange={(path) => patchSelectedNode((n) => {
                    n.cmdLine = path;
                    // URLs must be absolute; relative resolution would corrupt scheme:// targets.
                    if (isProbablyURL(path)) {
                        n.cmdWhat = "abs";
                    }
                })}
                kind="file"
                showReveal
                acceptUrls
            />
        </LabelAndField>
    );
}

function CommandPathFlags({ node }: NodeProps) {
    const isRelative = (node.cmdWhat ?? "rel") === "rel";

    return (
        <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <CheckboxAndTooltip
                label="Relative path"
                titleRich={(
                    <div className="text-xs font-light grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">
                        <span className="font-medium">Relative</span>
                        <span>Path relative to the folder containing tools.json.</span>
                        <span className="font-medium">Absolute</span>
                        <span>Full path or program name, used as-is after env-var expansion.</span>
                    </div>
                )}
                checked={isRelative}
                onCheckedChange={(v) => patchSelectedNode((n) => { n.cmdWhat = v ? "rel" : "abs"; })}
            />

            <CheckboxAndTooltip
                label="Run elevated"
                titleRich={<p className="text-xs">Launch this command with administrator privileges.</p>}
                checked={effectiveRunElevated(node)}
                onCheckedChange={(v) => patchSelectedNode((n) => { n.runElevated = v; })}
            />
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
