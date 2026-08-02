// Editable model for registry.json. Top-level groups sit under a fixed "Groups"
// root. Each group's `items` is an ordered list of registry values and/or
// nested groups.

import { type RegHive, type RegValueType, type RegView } from "@/bridge";

export type { RegHive, RegValueType, RegView };

export const REG_HIVES: readonly RegHive[] = ["HKCU", "HKLM", "HKCR", "HKU", "HKCC"] as const;

export const REG_VALUE_TYPES: readonly RegValueType[] = [
    "REG_SZ",
    "REG_EXPAND_SZ",
    "REG_DWORD",
    "REG_QWORD",
    "REG_BINARY",
    "REG_MULTI_SZ",
] as const;

/** Long hive names as they appear in .reg files and in regedit. */
export const HIVE_LONG_NAMES: Record<RegHive, string> = {
    HKCU: "HKEY_CURRENT_USER",
    HKLM: "HKEY_LOCAL_MACHINE",
    HKCR: "HKEY_CLASSES_ROOT",
    HKU: "HKEY_USERS",
    HKCC: "HKEY_CURRENT_CONFIG",
};

/** Short labels for the type selector. */
export const VALUE_TYPE_LABELS: Record<RegValueType, string> = {
    REG_SZ: "String",
    REG_EXPAND_SZ: "Expandable string",
    REG_DWORD: "DWORD (32-bit)",
    REG_QWORD: "QWORD (64-bit)",
    REG_BINARY: "Binary",
    REG_MULTI_SZ: "Multi-string",
};

export type RegItem = {
    hive: RegHive;
    /** Sub-key below the hive, e.g. SOFTWARE\DigitalPersona\Tracing. */
    keyPath: string;
    /** Empty string means the key's (Default) value. */
    valueName: string;
    valueType: RegValueType;
    /** Desired value in canonical text form; see the bridge RegValueSpec docs. */
    newValue: string;
    /** Display name; omitted from registry.json when empty or equal to the derived label. */
    name?: string;
    view?: RegView;
    requireElevated?: boolean;
    // Runtime-only identity for selection / DnD; stripped on serialize.
    uid?: string;
};

export type RegGroup = {
    name: string;
    requireElevated?: boolean;
    /** Ordered children: registry items and/or nested groups. */
    items: RegNode[];
    uid?: string;
};

/** A child of a group: either a registry item or a nested group. */
export type RegNode = RegItem | RegGroup;

export function isRegGroup(node: RegNode): node is RegGroup {
    return Array.isArray((node as RegGroup).items) && !("keyPath" in node);
}

export function isRegItem(node: RegNode): node is RegItem {
    return "keyPath" in node;
}

export type RegConfig = {
    groups: RegGroup[];
};

export type RegNodeKind = "root" | "group" | "item";

export type AddRegKind = "group" | "item";

export type RegSource = "default" | "file" | "storage" | "import";

export type RegEditorStore = {
    config: RegConfig;
    rootUid: string;
    source: RegSource;
    path: string;
    baseline: string;
    fileExists: boolean;
    dirty: boolean;
    status: string;
    error: string;
    selectedUid: string | null;
};

/** Hives whose writes normally need an elevated process. */
export function hiveNeedsElevation(hive: RegHive): boolean {
    return hive !== "HKCU";
}

// ---------------------------------------------------------------------------
// Stable runtime ids
//
// The synthetic "Groups" root has its own uid (not part of the JSON tree). On
// reload the counter resets to 0 while a cached rootUid like "r1" may remain,
// so the next newUid() for a group/item would collide with the root and make
// two rows appear selected. Seed from existing ids and reject duplicates.

let uidCounter = 0;

function newUid(): string {
    uidCounter += 1;
    return `r${uidCounter}`;
}

function seedUidCounterFrom(uids: Iterable<string>): void {
    for (const uid of uids) {
        const m = /^r(\d+)$/.exec(uid);
        if (m) {
            uidCounter = Math.max(uidCounter, Number(m[1]));
        }
    }
}

function collectExistingUids(nodes: RegNode[], into: string[]): void {
    for (const node of nodes) {
        if (node.uid) {
            into.push(node.uid);
        }
        if (isRegGroup(node)) {
            collectExistingUids(node.items, into);
        }
    }
}

function assignUids(nodes: RegNode[], used: Set<string>): void {
    for (const node of nodes) {
        if (!node.uid || used.has(node.uid)) {
            node.uid = newUid();
        }
        used.add(node.uid);
        if (isRegGroup(node)) {
            assignUids(node.items, used);
        }
    }
}

/**
 * Give fresh uids to any node in `nodes` (and below) that lacks one. Used for
 * subtrees built outside the editor, such as an imported .reg or JSON file.
 */
export function ensureNodeUids(nodes: RegNode[]): void {
    for (const node of nodes) {
        if (!node.uid) {
            node.uid = newUid();
        }
        if (isRegGroup(node)) {
            ensureNodeUids(node.items);
        }
    }
}

export function ensureUids(config: RegConfig, rootUidHolder: { rootUid: string; }): void {
    const existing: string[] = [];
    if (rootUidHolder.rootUid) {
        existing.push(rootUidHolder.rootUid);
    }
    collectExistingUids(config.groups, existing);
    seedUidCounterFrom(existing);

    if (!rootUidHolder.rootUid) {
        rootUidHolder.rootUid = newUid();
    }

    const used = new Set<string>([rootUidHolder.rootUid]);
    assignUids(config.groups, used);
}

export function createGroup(items?: RegNode[]): RegGroup {
    return {
        uid: newUid(),
        name: "New Group",
        items: items ?? [createItem()],
        requireElevated: false,
    };
}

export function createItem(): RegItem {
    return {
        uid: newUid(),
        hive: "HKCU",
        keyPath: "",
        valueName: "",
        valueType: "REG_SZ",
        newValue: "",
        requireElevated: false,
    };
}

/** Deep-clone a group (and nested nodes) with fresh runtime uids. */
export function cloneGroup(group: RegGroup): RegGroup {
    // JSON round-trip: structuredClone cannot clone valtio proxies.
    const clone = JSON.parse(JSON.stringify(group)) as RegGroup;
    reassignNodeUids(clone);
    return clone;
}

function reassignNodeUids(node: RegNode): void {
    node.uid = newUid();
    if (isRegGroup(node)) {
        for (const child of node.items ?? []) {
            reassignNodeUids(child);
        }
    }
}

/** Deep-clone a registry item with a fresh runtime uid. */
export function cloneItem(item: RegItem): RegItem {
    // JSON round-trip: structuredClone cannot clone valtio proxies.
    const clone = JSON.parse(JSON.stringify(item)) as RegItem;
    clone.uid = newUid();
    return clone;
}

/** Flatten all registry items under a group, including nested groups (depth-first). */
export function collectGroupItems(group: RegGroup): RegItem[] {
    const out: RegItem[] = [];
    for (const node of group.items ?? []) {
        if (isRegItem(node)) {
            out.push(node);
        } else {
            out.push(...collectGroupItems(node));
        }
    }
    return out;
}

/** True when `maybeAncestor` is `group` or contains it somewhere below. */
export function containsGroup(maybeAncestor: RegGroup, group: RegGroup): boolean {
    if (maybeAncestor === group || (!!maybeAncestor.uid && maybeAncestor.uid === group.uid)) {
        return true;
    }
    for (const node of maybeAncestor.items ?? []) {
        if (isRegGroup(node) && containsGroup(node, group)) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Lookups

export type RegGroupLocation = {
    kind: "group";
    group: RegGroup;
    /** Array that contains `group` (`config.groups` or a parent's `items`). */
    siblings: RegNode[];
    index: number;
    /** Immediate parent group, or null when under the root. */
    parent: RegGroup | null;
};

export type RegItemLocation = {
    kind: "item";
    item: RegItem;
    group: RegGroup;
    siblings: RegNode[];
    index: number;
};

export type RegLocation = RegGroupLocation | RegItemLocation;

export function findByUid(config: RegConfig, uid: string): RegLocation | null {
    // Root list is RegGroup[]; nested lists are RegNode[]. Both are spliced via siblings.
    return findInNodes(config.groups as RegNode[], uid, null);
}

function findInNodes(siblings: RegNode[], uid: string, parent: RegGroup | null): RegLocation | null {
    for (let index = 0; index < siblings.length; index++) {
        const node = siblings[index];
        if (node.uid === uid) {
            if (isRegGroup(node)) {
                return { kind: "group", group: node, siblings, index, parent };
            }
            if (!parent) {
                return null;
            }
            return { kind: "item", item: node, group: parent, siblings, index };
        }
        if (isRegGroup(node)) {
            const found = findInNodes(node.items, uid, node);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Selection path (survives uid reassignment across elevation restarts)
//
// Runtime uids are regenerated when loading from registry.json, so selection
// must be persisted as a stable index path and remapped after ensureUids.
// `path` walks `config.groups` then nested `items` arrays.

export type RegSelectionPath =
    | { kind: "root"; }
    | { kind: "group"; path: number[]; }
    | { kind: "item"; path: number[]; };

export function selectionPathFromUid(config: RegConfig, rootUid: string, uid: string | null | undefined): RegSelectionPath {
    if (!uid || uid === rootUid) {
        return { kind: "root" };
    }
    return walkSelectionPath(config.groups, uid, []) ?? { kind: "root" };
}

function walkSelectionPath(nodes: RegNode[], uid: string, path: number[]): RegSelectionPath | null {
    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        const next = [...path, index];
        if (node.uid === uid) {
            return isRegGroup(node)
                ? { kind: "group", path: next }
                : { kind: "item", path: next };
        }
        if (isRegGroup(node)) {
            const found = walkSelectionPath(node.items, uid, next);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

function nodeAtPath(config: RegConfig, path: number[]): RegNode | undefined {
    if (path.length === 0) {
        return undefined;
    }
    let node: RegNode | undefined = config.groups[path[0]];
    for (let i = 1; i < path.length; i++) {
        if (!node || !isRegGroup(node)) {
            return undefined;
        }
        node = node.items[path[i]];
    }
    return node;
}

export function uidFromSelectionPath(config: RegConfig, rootUid: string, path: RegSelectionPath | null | undefined): string {
    if (!path || path.kind === "root") {
        return rootUid;
    }
    const node = nodeAtPath(config, path.path);
    if (!node) {
        return rootUid;
    }
    if (path.kind === "group") {
        return isRegGroup(node) ? (node.uid ?? rootUid) : rootUid;
    }
    return isRegItem(node) ? (node.uid ?? rootUid) : rootUid;
}

export function parseRegSelectionPath(value: unknown): RegSelectionPath | null {
    if (!value || typeof value !== "object") {
        return null;
    }
    const path = value as Partial<RegSelectionPath> & { path?: number[]; };
    if (path.kind === "root") {
        return { kind: "root" };
    }
    if (
        (path.kind === "group" || path.kind === "item")
        && Array.isArray(path.path)
        && path.path.every((n) => Number.isInteger(n) && n >= 0)
    ) {
        return { kind: path.kind, path: path.path };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Labels

/** Last segment of a key path, used when an item has no explicit name. */
export function keyLeafName(keyPath: string): string {
    const key = keyPath.trim().replace(/\//g, "\\").replace(/\\+$/, "");
    if (!key) {
        return "";
    }
    const parts = key.split("\\");
    return parts[parts.length - 1] || key;
}

/** Name shown for an item's value: the value name, or "(Default)". */
export function valueDisplayName(valueName: string): string {
    return valueName.trim() ? valueName : "(Default)";
}

/** Derived label used when the item has no custom name. */
export function derivedItemLabel(item: Pick<RegItem, "keyPath" | "valueName">): string {
    const value = item.valueName?.trim();
    if (value) {
        return value;
    }
    const leaf = keyLeafName(item.keyPath);
    return leaf ? `${leaf}\\(Default)` : "(no key)";
}

export function itemLabel(item: Pick<RegItem, "keyPath" | "valueName" | "name">): string {
    const custom = item.name?.trim();
    if (custom) {
        return custom;
    }
    return derivedItemLabel(item);
}

/** Full "HIVE\subkey" path, as shown in tooltips and used for the regedit jump. */
export function fullKeyPath(item: Pick<RegItem, "hive" | "keyPath">): string {
    const sub = item.keyPath.trim().replace(/\//g, "\\").replace(/^\\+|\\+$/g, "");
    return sub ? `${item.hive}\\${sub}` : item.hive;
}
