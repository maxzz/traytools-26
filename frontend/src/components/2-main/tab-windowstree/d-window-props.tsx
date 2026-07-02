import { type ReactNode } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { type RectInfo, type WindowInfo } from "@/bridge";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/shadcn/tabs";
import { windowTreeStore } from "@/store/4-windows-tree";
import { propsTabAtom, type PropsTab } from "./a-windows-tree-atoms";

function hex8(n: number): string {
    return "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function rectText(r: RectInfo): string {
    return `(${r.left},${r.top})-(${r.right},${r.bottom}), ${r.width}x${r.height}`;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-0.5 items-start">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono break-all">{children}</span>
        </div>
    );
}

function GeneralTab({ info }: { info: WindowInfo }) {
    return (
        <div className="text-xs">
            <Row label="Handle">{info.handle}</Row>
            <Row label="Caption">{info.caption || <span className="text-muted-foreground/60">(empty)</span>}</Row>
            <Row label="Class">{info.className}{info.unicode ? "  (unicode)" : ""}</Row>
            <Row label="Style">{hex8(info.style)}  ({info.visible ? "visible" : "hidden"}, {info.enabled ? "enabled" : "disabled"})</Row>
            <Row label="ExStyle">{hex8(info.exStyle)}</Row>
            <Row label="Rectangle">{rectText(info.rect)}</Row>
            <Row label="Client Rect">{rectText(info.clientRect)}</Row>
            <Row label="Control ID">{info.controlId}</Row>
            <Row label="Instance">{info.instance}</Row>
            <Row label="User Data">{info.userData}</Row>
            <Row label="Parent">{info.parent.handle}{info.parent.className ? ` — ${info.parent.className}` : ""}</Row>
            <Row label="Owner">{info.owner.handle}{info.owner.className ? ` — ${info.owner.className}` : ""}</Row>
        </div>
    );
}

function StyleList({ title, hexValue, names }: { title: string; hexValue: number; names: string[] }) {
    return (
        <div className="mb-3">
            <div className="text-xs font-semibold mb-1">{title}: <span className="font-mono font-normal">{hex8(hexValue)}</span></div>
            {names.length === 0
                ? <div className="text-xs text-muted-foreground pl-2">(none)</div>
                : (
                    <ul className="text-xs font-mono pl-2 space-y-0.5">
                        {names.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                )}
        </div>
    );
}

function StylesTab({ info }: { info: WindowInfo }) {
    return (
        <div>
            <StyleList title="Window styles" hexValue={info.style} names={info.styleNames ?? []} />
            <StyleList title="Extended styles" hexValue={info.exStyle} names={info.exStyleNames ?? []} />
        </div>
    );
}

function ClassTab({ info }: { info: WindowInfo }) {
    return (
        <div className="text-xs">
            <Row label="Class Name">{info.className}</Row>
            <Row label="Atom">{info.classAtom}</Row>
            <Row label="Class Style">{hex8(info.classStyle)}</Row>
            <Row label="Class Bytes">{info.classExtraBytes}</Row>
            <Row label="Window Bytes">{info.windowExtraBytes}</Row>
        </div>
    );
}

function ProcessTab({ info }: { info: WindowInfo }) {
    return (
        <div className="text-xs">
            <Row label="Process ID">{hex8(info.processId)}  ({info.processId})</Row>
            <Row label="Thread ID">{hex8(info.threadId)}  ({info.threadId})</Row>
            <Row label="Name">{info.processName || <span className="text-muted-foreground/60">N/A</span>}</Row>
            <Row label="Path">{info.processPath || <span className="text-muted-foreground/60">N/A</span>}</Row>
        </div>
    );
}

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
                        <Tabs value={tab} onValueChange={(v) => setTab(v as PropsTab)} className="flex flex-1 min-h-0 flex-col gap-2 p-2">
                            <TabsList>
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="styles">Styles</TabsTrigger>
                                <TabsTrigger value="class">Class</TabsTrigger>
                                <TabsTrigger value="process">Process</TabsTrigger>
                            </TabsList>

                            <ScrollArea className="flex-1 min-h-0">
                                <TabsContent value="general"><GeneralTab info={info} /></TabsContent>
                                <TabsContent value="styles"><StylesTab info={info} /></TabsContent>
                                <TabsContent value="class"><ClassTab info={info} /></TabsContent>
                                <TabsContent value="process"><ProcessTab info={info} /></TabsContent>
                            </ScrollArea>
                        </Tabs>
                    )}
        </div>
    );
}
