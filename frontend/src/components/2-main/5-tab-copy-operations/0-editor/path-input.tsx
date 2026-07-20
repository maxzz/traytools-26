import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { FolderOpen, FileIcon } from "lucide-react";
import { cn } from "@/utils/classnames";
import { turnOffAutoComplete } from "@/utils/disable-hidden-children";
import { Input } from "@/ui/shadcn/input";
import { Button } from "@/ui/shadcn/button";
import { copyOpsBus } from "@/bridge";
import { OnFileDrop, OnFileDropOff } from "../../../../../wailsjs/runtime/runtime";

type PathKind = "file" | "folder";

type DropTarget = {
    el: HTMLElement;
    onPath: (path: string) => void;
};

const dropTargets = new Set<DropTarget>();
let dropListening = false;

function ensureDropListener() {
    if (dropListening) {
        return;
    }
    dropListening = true;
    OnFileDrop((x, y, paths) => {
        if (!paths?.length) {
            return;
        }
        for (const target of dropTargets) {
            const rect = target.el.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                target.onPath(paths[0]);
                return;
            }
        }
    }, true);
}

function registerDropTarget(target: DropTarget) {
    ensureDropListener();
    dropTargets.add(target);
    return () => {
        dropTargets.delete(target);
        if (dropTargets.size === 0 && dropListening) {
            OnFileDropOff();
            dropListening = false;
        }
    };
}

export function PathInput({
    kind,
    value,
    onChange,
    label,
}: {
    kind: PathKind;
    value: string;
    onChange: (path: string) => void;
    label: string;
}) {
    const [dragOver, setDragOver] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const browse = useCallback(
        async () => {
            try {
                const res = kind === "file" ? await copyOpsBus.pickFile() : await copyOpsBus.pickFolder();
                if (!res.canceled && res.path) {
                    onChange(res.path);
                }
            } catch (e) {
                console.error("Path browse failed", e);
            }
        },
        [kind, onChange]);

    useEffect(
        () => {
            const el = dropRef.current;
            if (!el) {
                return;
            }
            return registerDropTarget({
                el,
                onPath: (path) => onChangeRef.current(path),
            });
        },
        []);

    const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const onDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const text = e.dataTransfer.getData("text/plain")?.trim();
        if (text && (text.includes("\\") || text.includes("/") || /^[a-zA-Z]:/.test(text))) {
            onChange(text.replace(/^file:\/\/\//, "").replace(/\//g, "\\"));
        }
    };

    const Icon = kind === "file" ? FileIcon : FolderOpen;

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div
                ref={dropRef}
                className={cn(
                    "flex items-center gap-1 rounded-md",
                    dragOver && "ring-2 ring-sky-500 ring-offset-1",
                )}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                <Input
                    className="h-7 flex-1"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={kind === "file" ? "C:\\path\\to\\file" : "C:\\path\\to\\folder"}
                    {...turnOffAutoComplete}
                />
                <Button type="button" variant="outline" size="icon-xs" title={`Browse ${kind}`} onClick={browse}>
                    <Icon className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}
