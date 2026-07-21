import { type PropsWithChildren, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Copy, FolderOpen } from "lucide-react";
import { classNames } from "@/utils/classnames";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Button } from "@/ui/shadcn/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/shadcn/tabs";
import { notice } from "@/ui/local-ui/7-toaster";
import { appBus, isProcessGroupHandle, processGroupHandle, type ProcessInfo, type RectInfo, type WindowInfo, type WindowNode } from "@/bridge";
import { jumpToProcessInTree, windowTreeStore } from "./a-windows-tree-calls";
import { filteredTreeAtom, propsTabAtom, selectedHandleAtom, type PropsTab } from "./s-windows-tree-state";

export function WindowProps() {
    const snap = useSnapshot(windowTreeStore);
    const selectedHandle = useAtomValue(selectedHandleAtom);
    const [tab, setTab] = useAtom(propsTabAtom);
    const info = snap.info as WindowInfo | null;
    const processInfo = snap.processInfo as ProcessInfo | null;
    const processSelected = !!selectedHandle && isProcessGroupHandle(selectedHandle);

    // Map legacy Class/Styles tab ids (and the new id) onto Window Extra.
    const storedTab = tab as string;
    const activeTab: PropsTab =
        storedTab === "windowExtra" || storedTab === "class" || storedTab === "styles"
            ? "windowExtra"
            : "general";

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="px-2 py-1.5 border-b">
                <span className="text-xs font-semibold">Properties</span>
            </div>

            {snap.infoError
                ? (
                    <div className="p-3 text-xs text-destructive">
                        Failed to load {processSelected ? "process" : "window"} info: {snap.infoError}
                    </div>
                )
                : processSelected
                    ? (
                        !processInfo || !processInfo.valid
                            ? (
                                <div className="p-3 text-xs text-muted-foreground">
                                    {snap.infoLoading ? "Loading..." : "Select a process in the tree to view its properties."}
                                </div>
                            )
                            : (
                                <ScrollArea className="flex-1 min-h-0 p-2" fixedWidth parentContentWidth>
                                    <Tab_Process info={processInfo} />
                                </ScrollArea>
                            )
                    )
                    : !info || !info.valid
                        ? (
                            <div className="p-3 text-xs text-muted-foreground">
                                {snap.infoLoading ? "Loading..." : "Select a window in the tree to view its properties."}
                            </div>
                        )
                        : (
                            <Tabs value={activeTab} onValueChange={(v) => setTab(v as PropsTab)} className="flex-1 p-2 min-h-0 flex flex-col gap-2">
                                <TabsList>
                                    <TabsTrigger value="general">General</TabsTrigger>
                                    <TabsTrigger value="windowExtra">Window Extra</TabsTrigger>
                                </TabsList>

                                <ScrollArea className="flex-1 min-h-0" fixedWidth parentContentWidth>
                                    <TabsContent value="general"><Tab_General info={info} /></TabsContent>
                                    <TabsContent value="windowExtra"><Tab_WindowExtra info={info} /></TabsContent>
                                </ScrollArea>
                            </Tabs>
                        )
            }
        </div>
    );
}

function Tab_Process({ info }: { info: ProcessInfo; }) {
    const name = (info.processName ?? "").trim();
    const identifiedByPid = name === "";
    const { tree } = useAtomValue(filteredTreeAtom);
    const parentId = Number(info.parentProcessId) || 0;
    const parentInTree = parentId > 0 && treeHasProcess(tree, parentId);

    return (
        <div className="space-y-3">
            <Section title="Process">
                {identifiedByPid
                    ? (
                        <Row label="Identity">
                            <span>
                                Process ID <Mono>{info.processId}</Mono>
                                <span className="text-muted-foreground"> — identified by PID (image name unavailable)</span>
                            </span>
                        </Row>
                    )
                    : (
                        <>
                            <Row label="Name">{name}</Row>
                            <Row label="Process ID">
                                <Mono>{hex8(info.processId)}</Mono>  (<Mono>{info.processId}</Mono>)
                            </Row>
                        </>
                    )}

                <Row label="Parent PID">
                    {parentId > 0
                        ? (
                            <ParentProcessId
                                processId={parentId}
                                canJump={parentInTree}
                            />
                        )
                        : <span className="text-muted-foreground/60">N/A</span>}
                </Row>

                <Row label="Path">
                    <PathWithReveal path={info.processPath} />
                </Row>
                <Row label="Command line">
                    {info.commandLine
                        ? <span className="whitespace-pre-wrap break-all">{info.commandLine}</span>
                        : <span className="text-muted-foreground/60">N/A</span>}
                </Row>
                <Row label="Bits">{info.bits ? `${info.bits}-bit` : <span className="text-muted-foreground/60">N/A</span>}</Row>
                <Row label="Integrity">{integrityLabel(info.integrity)}</Row>
                <Row label="User">{info.userName || <span className="text-muted-foreground/60">N/A</span>}</Row>
            </Section>
        </div>
    );
}

function ParentProcessId({ processId, canJump }: { processId: number; canJump: boolean; }) {
    const label = (
        <>
            <Mono>{hex8(processId)}</Mono>  (<Mono>{processId}</Mono>)
        </>
    );
    if (!canJump) {
        return (
            <span title="Parent process is not present in the window tree">
                {label}
            </span>
        );
    }
    return (
        <button
            type="button"
            className="text-left underline-offset-2 hover:underline text-foreground"
            title="Jump to parent process in the tree"
            onClick={() => jumpToProcessInTree(processId)}
        >
            {label}
        </button>
    );
}

function treeHasProcess(node: WindowNode | null | undefined, processId: number): boolean {
    if (!node) {
        return false;
    }
    if (node.handle === processGroupHandle(processId)) {
        return true;
    }
    for (const child of node.children ?? []) {
        if (treeHasProcess(child, processId)) {
            return true;
        }
    }
    return false;
}

function PathWithReveal({ path }: { path: string; }) {
    if (!path) {
        return <span className="text-muted-foreground/60">N/A</span>;
    }
    const folder = parentDir(path);
    return (
        <span className="inline-flex items-start gap-1.5 min-w-0">
            <span className="break-all">{path}</span>
            <span className="inline-flex shrink-0 items-center gap-0.5">
                <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    className="size-5 rounded"
                    title="Open folder in File Explorer and highlight this file"
                    aria-label="Open folder"
                    onClick={() => {
                        void appBus.revealInExplorer(path).catch((e) => {
                            notice.error(`Failed to open folder:<br/>${String(e)}`);
                        });
                    }}
                >
                    <FolderOpen className="size-3 text-muted-foreground" />
                </Button>
                <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    className="size-5 rounded"
                    title="Copy folder path (without filename)"
                    aria-label="Copy folder path"
                    disabled={!folder}
                    onClick={() => void copyFolderPath(folder)}
                >
                    <Copy className="size-3 text-muted-foreground" />
                </Button>
            </span>
        </span>
    );
}

/** Parent directory of a Windows or POSIX file path (no filename). */
function parentDir(filePath: string): string {
    const normalized = filePath.replace(/\//g, "\\").replace(/\\+$/, "");
    const idx = normalized.lastIndexOf("\\");
    if (idx < 0) {
        return "";
    }
    // Keep drive root as "C:\"
    if (idx === 2 && normalized[1] === ":") {
        return normalized.slice(0, 3);
    }
    return normalized.slice(0, idx);
}

async function copyFolderPath(folder: string): Promise<void> {
    if (!folder) {
        return;
    }
    try {
        await navigator.clipboard.writeText(folder);
    } catch (e) {
        notice.error(`Failed to copy folder path:<br/>${String(e)}`);
    }
}

function Tab_General({ info }: { info: WindowInfo; }) {
    return (
        <div className="space-y-3">
            <Section title="Window">
                <Row label="Caption">{info.caption || <span className="text-muted-foreground/60">(empty)</span>}</Row>
                <Row label="Class">{info.className}{info.unicode ? "  (unicode)" : ""}</Row>
                <Row label="Handle"><Mono>{info.handle}</Mono></Row>
                <Row label="Style"> <Mono>{hex8(info.style)}</Mono> {"  "}({info.visible ? "visible" : "hidden"}, {info.enabled ? "enabled" : "disabled"})</Row>
                <Row label="ExStyle"><Mono>{hex8(info.exStyle)}</Mono></Row>
                <Row label="Rectangle"><Mono>{rectText(info.rect)}</Mono></Row>
                <Row label="Client Rect"><Mono>{rectText(info.clientRect)}</Mono></Row>
                <Row label="Control ID"><Mono>{info.controlId}</Mono></Row>
                <Row label="Instance"><Mono>{info.instance}</Mono></Row>
                <Row label="User Data"><Mono>{info.userData}</Mono></Row>
                <Row label="Parent"><Mono>{info.parent.handle}</Mono>{info.parent.className ? ` — ${info.parent.className}` : ""}</Row>
                <Row label="Owner"><Mono>{info.owner.handle}</Mono>{info.owner.className ? ` — ${info.owner.className}` : ""}</Row>
            </Section>

            <Section title="Process">
                <Row label="Process ID"><Mono>{hex8(info.processId)}</Mono>  (<Mono>{info.processId}</Mono>)</Row>
                <Row label="Thread ID"><Mono>{hex8(info.threadId)}</Mono>  (<Mono>{info.threadId}</Mono>)</Row>
                <Row label="Name">{info.processName || <span className="text-muted-foreground/60">N/A</span>}</Row>
                <Row label="Path">
                    <PathWithReveal path={info.processPath} />
                </Row>
                <Row label="Bits">{info.bits ? `${info.bits}-bit` : <span className="text-muted-foreground/60">N/A</span>}</Row>
                <Row label="User">{info.userName || <span className="text-muted-foreground/60">N/A</span>}</Row>
                <Row label="Integrity">{integrityLabel(info.integrity)}</Row>
            </Section>
        </div>
    );
}

function Tab_WindowExtra({ info }: { info: WindowInfo; }) {
    return (
        <div className="space-y-3">
            <Section title="Class">
                <Row label="Class Name">{info.className}</Row>
                <Row label="Atom"><Mono>{info.classAtom}</Mono></Row>
                <Row label="Class Style"><Mono>{hex8(info.classStyle)}</Mono></Row>
                <Row label="Class Bytes"><Mono>{info.classExtraBytes}</Mono></Row>
                <Row label="Window Bytes"><Mono>{info.windowExtraBytes}</Mono></Row>
            </Section>

            <Section title="Style" grid={false}>
                <StyleList title="Window styles" hexValue={info.style} names={info.styleNames ?? []} />
                <StyleList title="Extended styles" hexValue={info.exStyle} names={info.exStyleNames ?? []} />
            </Section>
        </div>
    );
}

function StyleList({ title, hexValue, names }: { title: string; hexValue: number; names: string[]; }) {
    return (
        <div className="mb-2 last:mb-0">
            <div className="mb-1 text-xs">
                <span className="text-muted-foreground">{title}</span>
                {": "}
                <Mono>{hex8(hexValue)}</Mono>
            </div>
            {names.length === 0
                ? <div className="pl-2 text-xs text-muted-foreground">(none)</div>
                : (
                    <ul className="pl-2 text-xs space-y-0.5">
                        {names.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                )}
        </div>
    );
}

function integrityLabel(level: WindowInfo["integrity"] | ProcessInfo["integrity"]): ReactNode {
    switch (level) {
        case "high": return "High";
        case "medium": return "Medium";
        case "mediumplus": return "Medium Plus";
        case "low": return "Low";
        case "na": return "N/A";
        case "undetected":
        default:
            return <span className="text-muted-foreground/60">N/A</span>;
    }
}

// Utility components and functions

function Section({ title, children, grid = true }: PropsWithChildren<{ title: string; grid?: boolean; }>) {
    return (
        <div>
            <div className="mb-1 text-xs font-semibold">{title}</div>
            {grid ? <Grid>{children}</Grid> : children}
        </div>
    );
}

function Grid({ children }: PropsWithChildren) {
    return (
        <div className="text-xs font-condensed grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-start">
            {children}
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode; }) {
    return (<>
        <span className="text-muted-foreground">{label}</span>
        <span className="break-all">{children}</span>
    </>);
}

function Mono({ children, className }: PropsWithChildren<{ className?: string; }>) {
    return <span className={classNames("text-[0.65rem] font-mono text-foreground/80", className)}>{children}</span>;
}

function hex8(n: number): string {
    return "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function rectText(r: RectInfo): string {
    return `(${r.left},${r.top})-(${r.right},${r.bottom}), ${r.width}x${r.height}`;
}
