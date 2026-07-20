import { type ReactNode } from "react";
import { Copy } from "lucide-react";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { Button } from "@/ui/shadcn/button";
import { type CopyGroup, type CopyOpItem } from "@/components/2-main/5-tab-copy-operations/a-atoms/9-types-copy";
import { patchSelectedGroup, patchSelectedItem } from "@/components/2-main/5-tab-copy-operations/a-atoms/use-selected-node";
import { copyEditorStore } from "@/components/2-main/5-tab-copy-operations/a-atoms/0-copy-local-storage";
import { runCopyGroup, runCopyItem } from "@/components/2-main/5-tab-copy-operations/a-atoms/2-run-copy";
import { PathInput } from "./path-input";

export function PropsFor_Root() {
    return (
        <p className="text-muted-foreground">
            Root of the copy operations tree. Add groups here. Groups and items can be reordered by drag-and-drop.
            This node cannot be moved or deleted.
        </p>
    );
}

export function PropsFor_Group({ group }: { group: CopyGroup; }) {
    return (<>
        <Button
            className="-my-2 self-end"
            variant="default"
            size="xs"
            disabled={group.items.length === 0}
            onClick={() => {
                const live = copyEditorStore.config.groups.find((g) => g.uid === group.uid);
                if (live) {
                    runCopyGroup(live);
                }
            }}
            type="button"
        >
            <Copy className="size-3.5" />
            Copy group
        </Button>

        <LabelAndField label="Group name">
            <Input
                className="h-7"
                value={group.name}
                onChange={(e) => patchSelectedGroup((g) => { g.name = e.target.value; })}
                {...turnOffAutoComplete}
            />
        </LabelAndField>

        <FlagSwitch
            label="Stop DpAgent before copy"
            hint="If DpAgent is running, stop it and wait until it is confirmed stopped before copying any items in this group."
            checked={!!group.stopDpAgent}
            onCheckedChange={(v) => patchSelectedGroup((g) => { g.stopDpAgent = v; })}
        />

        <FlagSwitch
            label="Require elevated privileges"
            hint="Use when destinations include protected folders such as Program Files."
            checked={!!group.requireElevated}
            onCheckedChange={(v) => patchSelectedGroup((g) => { g.requireElevated = v; })}
        />
    </>);
}

export function PropsFor_Item({ item }: { item: CopyOpItem; }) {
    return (<>
        <Button
            className="-my-2 self-end"
            variant="default"
            size="xs"
            disabled={!item.sourceFile.trim() || !item.destFolder.trim()}
            onClick={() => {
                for (const g of copyEditorStore.config.groups) {
                    const live = g.items.find((it) => it.uid === item.uid);
                    if (live) {
                        runCopyItem(live);
                        return;
                    }
                }
            }}
            type="button"
        >
            <Copy className="size-3.5" />
            Copy file
        </Button>

        <PathInput
            kind="file"
            label="Source file"
            value={item.sourceFile}
            onChange={(path) => patchSelectedItem((it) => { it.sourceFile = path; })}
        />

        <PathInput
            kind="folder"
            label="Destination folder"
            value={item.destFolder}
            onChange={(path) => patchSelectedItem((it) => { it.destFolder = path; })}
        />

        <FlagSwitch
            label="Stop DpAgent before copy"
            hint="Stop DpAgent (if running) before this single copy."
            checked={!!item.stopDpAgent}
            onCheckedChange={(v) => patchSelectedItem((it) => { it.stopDpAgent = v; })}
        />

        <FlagSwitch
            label="Require elevated privileges"
            hint="Use when the destination is a protected system folder."
            checked={!!item.requireElevated}
            onCheckedChange={(v) => patchSelectedItem((it) => { it.requireElevated = v; })}
        />
    </>);
}

function FlagSwitch({ label, hint, checked, onCheckedChange, }: { label: string; hint: string; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    return (
        <div className="text-xs flex flex-col">
            <Label className="-mr-1 cursor-pointer flex items-center justify-between gap-1">
                {label}
                <Switch className="scale-65" checked={checked} onCheckedChange={onCheckedChange} />
            </Label>
            <p className="text-[0.65rem] text-muted-foreground">{hint}</p>
        </div>
    );
}

function LabelAndField({ label, children }: { label: string; children: ReactNode; }) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-xs">{label}</Label>
            {children}
        </div>
    );
}
