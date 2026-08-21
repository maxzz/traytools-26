import { proxy } from "valtio";
import { fileIconBus } from "@/bridge";
import { type FileIconEntry } from "./9-types-icons";

/** Path-keyed icon cache. Keys are normalized (lowercased, trimmed). */
export const fileIconStore = proxy<{ byPath: Record<string, FileIconEntry>; }>({
    byPath: {},
});

const inFlight = new Set<string>();
/** key → original path casing for the Go request */
const pendingByKey = new Map<string, string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function normalizeFileIconPath(path: string | null | undefined): string {
    return (path ?? "").trim().toLowerCase();
}

export function getFileIconEntry(path: string | null | undefined): FileIconEntry | undefined {
    const key = normalizeFileIconPath(path);
    if (!key) {
        return undefined;
    }
    return fileIconStore.byPath[key];
}

/**
 * Ensures icons for the given paths are requested in the background.
 * Already-cached / in-flight paths are skipped; new paths are batched.
 */
export function ensureFileIcons(paths: Array<string | null | undefined>): void {
    let scheduled = false;

    for (const raw of paths) {
        const original = (raw ?? "").trim();
        if (!original) {
            continue;
        }
        const key = normalizeFileIconPath(original);
        if (!key) {
            continue;
        }

        const existing = fileIconStore.byPath[key];
        if (existing && (existing.status === "ready" || existing.status === "missing" || existing.status === "loading")) {
            continue;
        }
        if (inFlight.has(key) || pendingByKey.has(key)) {
            continue;
        }

        fileIconStore.byPath[key] = { status: "loading", dataUrl: "" };
        pendingByKey.set(key, original);
        scheduled = true;
    }

    if (scheduled) {
        scheduleFlush();
    }
}

function scheduleFlush(): void {
    if (flushTimer != null) {
        return;
    }
    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushPending();
    }, 16);
}

async function flushPending(): Promise<void> {
    if (pendingByKey.size === 0) {
        return;
    }

    const batch = [...pendingByKey.entries()];
    pendingByKey.clear();

    const originals: string[] = [];
    const keys: string[] = [];
    for (const [key, original] of batch) {
        if (inFlight.has(key)) {
            continue;
        }
        inFlight.add(key);
        keys.push(key);
        originals.push(original);
        if (!fileIconStore.byPath[key]) {
            fileIconStore.byPath[key] = { status: "loading", dataUrl: "" };
        } else {
            fileIconStore.byPath[key].status = "loading";
        }
    }

    if (originals.length === 0) {
        return;
    }

    try {
        const results = await fileIconBus.getFileIcons(originals);
        const byKey = new Map<string, string>();
        for (const r of results ?? []) {
            const key = normalizeFileIconPath(r.path);
            if (!key) {
                continue;
            }
            byKey.set(key, typeof r.dataUrl === "string" ? r.dataUrl : "");
        }

        for (const key of keys) {
            const dataUrl = byKey.get(key) ?? "";
            fileIconStore.byPath[key] = {
                status: dataUrl ? "ready" : "missing",
                dataUrl,
            };
            inFlight.delete(key);
        }
    } catch (e) {
        console.warn("Failed to fetch file icons", e);
        for (const key of keys) {
            fileIconStore.byPath[key] = { status: "missing", dataUrl: "" };
            inFlight.delete(key);
        }
    }
}
