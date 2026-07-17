import { type PropsWithChildren, type ReactNode } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { type RectInfo, type WindowInfo } from "@/bridge";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/shadcn/tabs";
import { windowTreeStore } from "@/store/4-windows-tree";
import { propsTabAtom, type PropsTab } from "./a-windows-tree-atoms";

export function WindowProps() {
    const snap = useSnapshot(windowTreeStore);
    const [tab, setTab] = useAtom(propsTabAtom);
    const info = snap.info as WindowInfo | null;

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="px-2 py-1.5 border-b">
                <span className="text-xs font-semibold">Properties</span>
            </div>

            {snap.infoError
                ? <div className="p-3 text-xs text-destructive">Failed to load window info: {snap.infoError}</div>
                : !info || !info.valid
                    ? <div className="p-3 text-xs text-muted-foreground">{snap.infoLoading ? "Loading..." : "Select a window in the tree to view its properties."}</div>
                    : (
                        <Tabs value={tab} onValueChange={(v) => setTab(v as PropsTab)} className="flex-1 p-2 min-h-0 flex flex-col gap-2">
                            <TabsList>
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="class">Class</TabsTrigger>
                                <TabsTrigger value="process">Process</TabsTrigger>
                                <TabsTrigger value="styles">Styles</TabsTrigger>
                            </TabsList>

                            <ScrollArea className="flex-1 min-h-0" fixedWidth parentContentWidth>
                                <TabsContent value="general"><Tab_General info={info} /></TabsContent>
                                <TabsContent value="class"><Tab_Class info={info} /></TabsContent>
                                <TabsContent value="process"><Tab_Process info={info} /></TabsContent>
                                <TabsContent value="styles"><Tab_Styles info={info} /></TabsContent>
                            </ScrollArea>
                        </Tabs>
                    )
            }
        </div>
    );
}

function Tab_General({ info }: { info: WindowInfo; }) {
    return (
        <Grid>
            <Row label="Handle"><Mono>{info.handle}</Mono></Row>
            <Row label="Caption">{info.caption || <span className="text-muted-foreground/60">(empty)</span>}</Row>
            <Row label="Class">{info.className}{info.unicode ? "  (unicode)" : ""}</Row>
            <Row label="Style"> <Mono>{hex8(info.style)}</Mono> {"  "}({info.visible ? "visible" : "hidden"}, {info.enabled ? "enabled" : "disabled"})</Row>
            <Row label="ExStyle"><Mono>{hex8(info.exStyle)}</Mono></Row>
            <Row label="Rectangle"><Mono>{rectText(info.rect)}</Mono></Row>
            <Row label="Client Rect"><Mono>{rectText(info.clientRect)}</Mono></Row>
            <Row label="Control ID"><Mono>{info.controlId}</Mono></Row>
            <Row label="Instance"><Mono>{info.instance}</Mono></Row>
            <Row label="User Data"><Mono>{info.userData}</Mono></Row>
            <Row label="Parent"><Mono>{info.parent.handle}</Mono>{info.parent.className ? ` — ${info.parent.className}` : ""}</Row>
            <Row label="Owner"><Mono>{info.owner.handle}</Mono>{info.owner.className ? ` — ${info.owner.className}` : ""}</Row>
        </Grid>
    );
}

function Tab_Styles({ info }: { info: WindowInfo; }) {
    return (
        <div>
            <StyleList title="Window styles" hexValue={info.style} names={info.styleNames ?? []} />
            <StyleList title="Extended styles" hexValue={info.exStyle} names={info.exStyleNames ?? []} />
        </div>
    );
}

function StyleList({ title, hexValue, names }: { title: string; hexValue: number; names: string[]; }) {
    return (
        <div className="mb-3">
            <div className="mb-1 text-xs font-semibold">{title}: <Mono className="font-normal">{hex8(hexValue)}</Mono></div>
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

function Tab_Class({ info }: { info: WindowInfo; }) {
    return (
        <Grid>
            <Row label="Class Name">{info.className}</Row>
            <Row label="Atom"><Mono>{info.classAtom}</Mono></Row>
            <Row label="Class Style"><Mono>{hex8(info.classStyle)}</Mono></Row>
            <Row label="Class Bytes"><Mono>{info.classExtraBytes}</Mono></Row>
            <Row label="Window Bytes"><Mono>{info.windowExtraBytes}</Mono></Row>
        </Grid>
    );
}

function Tab_Process({ info }: { info: WindowInfo; }) {
    return (
        <Grid>
            <Row label="Process ID"><Mono>{hex8(info.processId)}</Mono>  (<Mono>{info.processId}</Mono>)</Row>
            <Row label="Thread ID"><Mono>{hex8(info.threadId)}</Mono>  (<Mono>{info.threadId}</Mono>)</Row>
            <Row label="Name">{info.processName || <span className="text-muted-foreground/60">N/A</span>}</Row>
            <Row label="Path">{info.processPath || <span className="text-muted-foreground/60">N/A</span>}</Row>
            <Row label="Bits">{info.bits ? `${info.bits}-bit` : <span className="text-muted-foreground/60">N/A</span>}</Row>
            <Row label="User">{info.userName || <span className="text-muted-foreground/60">N/A</span>}</Row>
            <Row label="Integrity">{integrityLabel(info.integrity)}</Row>
        </Grid>
    );
}

function integrityLabel(level: WindowInfo["integrity"]): ReactNode {
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
    return <span className={className ? `font-mono ${className}` : "font-mono"}>{children}</span>;
}

function hex8(n: number): string {
    return "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function rectText(r: RectInfo): string {
    return `(${r.left},${r.top})-(${r.right},${r.bottom}), ${r.width}x${r.height}`;
}
