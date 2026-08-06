// Editable model for registry.json. Top-level groups sit under a fixed "Groups"
// root. Each group's `items` is an ordered list of registry keys, nested
// groups, and/or separators ({ separator: true }). A key holds one or more
// named values in `values`.

import { type RegHive, type RegValueType, type RegView } from "@/bridge";

export type { RegHive, RegValueType, RegView };

/** Long hive names as they appear in .reg files and in regedit. */
export const HIVE_LONG_NAMES: Record<RegHive, string> = {
    HKCU: "HKEY_CURRENT_USER",
    HKLM: "HKEY_LOCAL_MACHINE",
    HKCR: "HKEY_CLASSES_ROOT",
    HKU: "HKEY_USERS",
    HKCC: "HKEY_CURRENT_CONFIG",
};

/** Short and long hive aliases (uppercase) → canonical short hive for ops. */
const HIVE_ALIASES: Record<string, RegHive> = {
    HKCU: "HKCU",
    HKLM: "HKLM",
    HKCR: "HKCR",
    HKU: "HKU",
    HKCC: "HKCC",
    HKEY_CURRENT_USER: "HKCU",
    HKEY_LOCAL_MACHINE: "HKLM",
    HKEY_CLASSES_ROOT: "HKCR",
    HKEY_USERS: "HKU",
    HKEY_CURRENT_CONFIG: "HKCC",
};

/** Resolve HKCU / HKEY_CURRENT_USER (any case) to the short hive used by ops. */
export function parseHiveAlias(head: string): RegHive | null {
    return HIVE_ALIASES[head.trim().toUpperCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Value types

export const REG_VALUE_TYPES: readonly RegValueType[] = [
    "REG_SZ",
    "REG_EXPAND_SZ",
    "REG_DWORD",
    "REG_QWORD",
    "REG_BINARY",
    "REG_MULTI_SZ",
] as const;

/** Short labels for the type selector. */
export const VALUE_TYPE_LONG_LABELS: Record<RegValueType, string> = {
    REG_SZ: "String",
    REG_EXPAND_SZ: "Expandable string",
    REG_DWORD: "DWORD (32-bit)",
    REG_QWORD: "QWORD (64-bit)",
    REG_BINARY: "Binary",
    REG_MULTI_SZ: "Multi-string",
};

/** Abbreviated labels, for the narrow type column of the values table. */
export const VALUE_TYPE_SHORT_LABELS: Record<RegValueType, string> = {
    REG_SZ: "String",
    REG_EXPAND_SZ: "Expand",
    REG_DWORD: "DWORD",
    REG_QWORD: "QWORD",
    REG_BINARY: "Binary",
    REG_MULTI_SZ: "Multi",
};

// ---------------------------------------------------------------------------

/** One named value under a key. Many values can share a single RegItem key. */
export type RegValue = {
    /** Empty string means the key's (Default) value. */
    valueName: string;
    valueType: RegValueType;
    /** Desired value in canonical text form; see the bridge RegValueSpec docs. */
    newValue: string;
    // Runtime-only identity for read results / row reorder; stripped on serialize.
    uid?: string;
};

/** A registry key plus the ordered list of values authored under it. */
export type RegItem = {
    /**
     * Full key including the hive, stored exactly as typed/loaded
     * (e.g. HKCU\SOFTWARE\…, HKEY_LOCAL_MACHINE\…, HKLM\\SOFTWARE\\…, HKLM/SOFTWARE\…).
     * Normalized only when used for registry read/write or regedit jump.
     */
    keyPath: string;
    /** At least one value; the editor never leaves this empty. */
    values: RegValue[];
    /** Display name; omitted from registry.json when empty or equal to the derived label. */
    name?: string;
    view?: RegView;
    /** Optional note stored in registry.json; omitted when empty. */
    comment?: string;
    // Runtime-only identity for selection / DnD; stripped on serialize.
    uid?: string;
};

/** A value together with the key that owns it — the unit registry ops act on. */
export type RegValueRef = {
    item: RegItem;
    value: RegValue;
};

export type RegGroup = {
    name: string;
    /** Optional note stored in registry.json; omitted when empty. */
    comment?: string;
    /** Ordered children: registry items, nested groups, and/or separators. */
    items: RegNode[];
    uid?: string;
};

/** Visual divider in a group's item list. Persists as `{ "separator": true }`. */
export type RegSeparator = {
    separator: true;
    /** Optional note stored in registry.json; omitted when empty. */
    comment?: string;
    uid?: string;
};

/** A child of a group: registry item, nested group, or separator. */
export type RegNode = RegItem | RegGroup | RegSeparator;

export function isRegSeparator(node: RegNode): node is RegSeparator {
    return (node as RegSeparator).separator === true;
}

export function isRegGroup(node: RegNode): node is RegGroup {
    return !isRegSeparator(node) && Array.isArray((node as RegGroup).items) && !("keyPath" in node);
}

export function isRegItem(node: RegNode): node is RegItem {
    return !isRegSeparator(node) && "keyPath" in node;
}

export type RegConfig = {
    /** Optional note for the tree root; omitted from registry.json when empty. */
    comment?: string;
    groups: RegGroup[];
};

export type RegNodeKind = "root" | "group" | "item" | "separator";

export type AddRegKind = "group" | "item" | "separator";

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
    /**
     * Uids of collapsed folders in the tree UI (root + groups).
     * Persisted per filename as index-path ids in a separate localStorage map
     * so each file keeps its own expand state across import/reload.
     */
    collapsedUids: string[];
    /**
     * After a failed save due to invalid key paths, validate immediately
     * (skip the typing debounce) until the next successful save.
     */
    strictKeyPathValidation: boolean;
    /**
     * Most-recently-used key paths (validated spelling as typed). Newest first.
     * Persisted with the registry editor localStorage cache.
     */
    keyPathMru: string[];
};

/** 
 * Hives whose writes normally need an elevated process.
 * Administrator privileges (or an elevated process token) are generally required to 
 * write or make changes to the HKLM registry hive in Windows.
 * By default, standard users and non-elevated applications have read-only access 
 * to HKLM and full write access only to HKCU.
 */
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
        } else if (isRegItem(node)) {
            for (const value of node.values ?? []) {
                if (value.uid) {
                    into.push(value.uid);
                }
            }
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
        } else if (isRegItem(node)) {
            for (const value of node.values ?? []) {
                if (!value.uid || used.has(value.uid)) {
                    value.uid = newUid();
                }
                used.add(value.uid);
            }
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
        } else if (isRegItem(node)) {
            for (const value of node.values ?? []) {
                if (!value.uid) {
                    value.uid = newUid();
                }
            }
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
    };
}

export function createItem(): RegItem {
    return {
        uid: newUid(),
        keyPath: "HKCU",
        values: [createValue()],
    };
}

export function createValue(): RegValue {
    return {
        uid: newUid(),
        valueName: "",
        valueType: "REG_SZ",
        newValue: "",
    };
}

export function createSeparator(): RegSeparator {
    return {
        uid: newUid(),
        separator: true,
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
    } else if (isRegItem(node)) {
        for (const value of node.values ?? []) {
            value.uid = newUid();
        }
    }
}

/** Deep-clone a registry item (with its values) using fresh runtime uids. */
export function cloneItem(item: RegItem): RegItem {
    // JSON round-trip: structuredClone cannot clone valtio proxies.
    const clone = JSON.parse(JSON.stringify(item)) as RegItem;
    clone.uid = newUid();
    for (const value of clone.values ?? []) {
        value.uid = newUid();
    }
    return clone;
}

/** Clone a separator with a fresh runtime uid. */
export function cloneSeparator(separator: RegSeparator): RegSeparator {
    const clone = createSeparator();
    if (separator.comment?.trim()) {
        clone.comment = separator.comment;
    }
    return clone;
}

/** Flatten all registry keys under a group, including nested groups (depth-first). */
export function collectGroupItems(group: RegGroup): RegItem[] {
    const out: RegItem[] = [];
    for (const node of group.items ?? []) {
        if (isRegItem(node)) {
            out.push(node);
        } else if (isRegGroup(node)) {
            out.push(...collectGroupItems(node));
        }
    }
    return out;
}

/** Every value of one key, paired with the key that owns it. */
export function itemValueRefs(item: RegItem): RegValueRef[] {
    return (item.values ?? []).map((value) => ({ item, value }));
}

/** Every value under a group, in tree order (depth-first through nested groups). */
export function collectGroupValueRefs(group: RegGroup): RegValueRef[] {
    return collectGroupItems(group).flatMap(itemValueRefs);
}

/** Total number of authored values under a group, including nested groups. */
export function countGroupValues(group: RegGroup): number {
    return collectGroupItems(group).reduce((n, item) => n + (item.values?.length ?? 0), 0);
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

export type RegSeparatorLocation = {
    kind: "separator";
    separator: RegSeparator;
    group: RegGroup;
    siblings: RegNode[];
    index: number;
};

export type RegValueLocation = {
    kind: "value";
    value: RegValue;
    item: RegItem;
    group: RegGroup;
    /** Position inside `item.values`. */
    index: number;
};

export type RegLocation = RegGroupLocation | RegItemLocation | RegSeparatorLocation;

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
            if (isRegSeparator(node)) {
                return { kind: "separator", separator: node, group: parent, siblings, index };
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

/** Locate a single value by its runtime uid, together with its key and group. */
export function findValueByUid(config: RegConfig, uid: string): RegValueLocation | null {
    for (const group of config.groups) {
        const found = findValueInGroup(group, uid);
        if (found) {
            return found;
        }
    }
    return null;
}

function findValueInGroup(group: RegGroup, uid: string): RegValueLocation | null {
    for (const node of group.items ?? []) {
        if (isRegItem(node)) {
            const index = (node.values ?? []).findIndex((value) => value.uid === uid);
            if (index >= 0) {
                return { kind: "value", value: node.values[index], item: node, group, index };
            }
        } else if (isRegGroup(node)) {
            const found = findValueInGroup(node, uid);
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
    | { kind: "item"; path: number[]; }
    | { kind: "separator"; path: number[]; };

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
            if (isRegGroup(node)) {
                return { kind: "group", path: next };
            }
            if (isRegSeparator(node)) {
                return { kind: "separator", path: next };
            }
            return { kind: "item", path: next };
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
    if (path.kind === "separator") {
        return isRegSeparator(node) ? (node.uid ?? rootUid) : rootUid;
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
        (path.kind === "group" || path.kind === "item" || path.kind === "separator")
        && Array.isArray(path.path)
        && path.path.every((n) => Number.isInteger(n) && n >= 0)
    ) {
        return { kind: path.kind, path: path.path };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Collapsed tree paths (survive remounts and uid reassignment)
//
// Live state uses uids (reorder-safe). Persistence (per filename) uses the
// same index-path scheme as selection: "root" for Groups, or "0", "0.2".

const ROOT_COLLAPSE_KEY = "root";

/** Stable collapse key for the Groups root or a group uid; null for leaves. */
export function collapseKeyFromUid(config: RegConfig, rootUid: string, uid: string | null | undefined): string | null {
    if (!uid) {
        return null;
    }
    if (uid === rootUid) {
        return ROOT_COLLAPSE_KEY;
    }
    const path = selectionPathFromUid(config, rootUid, uid);
    if (path.kind !== "group") {
        return null;
    }
    return path.path.join(".");
}

/** Map a persisted collapse key back to a runtime uid after ensureUids. */
export function uidFromCollapseKey(config: RegConfig, rootUid: string, key: string): string | null {
    if (key === ROOT_COLLAPSE_KEY) {
        return rootUid;
    }
    if (!isValidCollapseKey(key)) {
        return null;
    }
    const path = key.split(".").map(Number);
    const uid = uidFromSelectionPath(config, rootUid, { kind: "group", path });
    return uid === rootUid ? null : uid;
}

export function parseCollapsedPaths(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((key): key is string => typeof key === "string" && isValidCollapseKey(key));
}

function isValidCollapseKey(key: string): boolean {
    if (key === ROOT_COLLAPSE_KEY) {
        return true;
    }
    if (!key) {
        return false;
    }
    return key.split(".").every((part) => {
        const n = Number(part);
        return Number.isInteger(n) && n >= 0 && String(n) === part;
    });
}

/** Persistable keys for the current collapsed uids (skips leaves / missing nodes). */
export function collapsedPathsFromUids(config: RegConfig, rootUid: string, uids: string[]): string[] {
    const keys: string[] = [];
    for (const uid of uids) {
        const key = collapseKeyFromUid(config, rootUid, uid);
        if (key && !keys.includes(key)) {
            keys.push(key);
        }
    }
    return keys;
}

/** Restore collapsed uids from persisted index paths after ensureUids. */
export function collapsedUidsFromPaths(config: RegConfig, rootUid: string, paths: string[]): string[] {
    const uids: string[] = [];
    for (const key of paths) {
        const uid = uidFromCollapseKey(config, rootUid, key);
        if (uid && !uids.includes(uid)) {
            uids.push(uid);
        }
    }
    return uids;
}

// ---------------------------------------------------------------------------
// Key path helpers (hive is part of keyPath)

/**
 * Split a typed "HKCU\path" or "HKEY_CURRENT_USER\path" into hive + subkey.
 * Unknown first segment keeps `fallbackHive` and treats the whole string as the subkey.
 */
export function parseItemKeyPath(text: string, fallbackHive: RegHive = "HKCU"): { hive: RegHive; subKey: string; } {
    const normalized = text.trim().replace(/\//g, "\\").replace(/\\+/g, "\\").replace(/^\\+/, "");
    if (!normalized) {
        return { hive: fallbackHive, subKey: "" };
    }
    const slash = normalized.indexOf("\\");
    const head = slash < 0 ? normalized : normalized.slice(0, slash);
    const hive = parseHiveAlias(head);
    if (!hive) {
        return { hive: fallbackHive, subKey: normalized.replace(/\\+$/g, "") };
    }
    const rest = slash < 0 ? "" : normalized.slice(slash + 1).replace(/\\+$/g, "");
    return { hive, subKey: rest };
}

/**
 * Canonical short-hive form for registry ops / reports, e.g. HKCU\SOFTWARE\Vendor.
 * Not used for persistence — `keyPath` keeps the author's original spelling.
 */
export function normalizeItemKeyPath(text: string, fallbackHive: RegHive = "HKCU"): string {
    const { hive, subKey } = parseItemKeyPath(text, fallbackHive);
    return subKey ? `${hive}\\${subKey}` : hive;
}

const KEY_NAME_MAX = 255;

/**
 * Validate a stored keyPath spelling. Returns an error message, or null when ok.
 * Separators may be `\`, `\\`, or `/`; hive may be short or long. Structural
 * checks run on a normalized form without rewriting the stored value.
 *
 * Minimum shape: hive \ top-level key \ company/app folder
 * (e.g. HKEY_CURRENT_USER\Software\Vendor). Further segments may follow for
 * the folder that holds the actual values.
 */
export function validateItemKeyPath(text: string): string | null {
    if (!text.trim()) {
        return "Key path is required.";
    }

    const normalized = text.trim().replace(/\//g, "\\").replace(/\\+/g, "\\").replace(/^\\+/, "").replace(/\\+$/g, "");
    if (!normalized) {
        return "Key path is required.";
    }

    const segments = normalized.split("\\");
    const head = segments[0] ?? "";
    if (!parseHiveAlias(head)) {
        return "Key path must start with a registry hive (HKCU, HKLM, HKEY_CURRENT_USER, …).";
    }

    // hive \ Software \ Company[\ Product…]
    if (segments.length < 3) {
        return "Key path needs at least hive\\top-level key\\company or app (e.g. HKCU\\Software\\Vendor).";
    }

    for (const segment of segments.slice(1)) {
        if (!segment) {
            return "Key path has an empty segment.";
        }
        if (segment.length > KEY_NAME_MAX) {
            return `Each key name must be ${KEY_NAME_MAX} characters or fewer.`;
        }
        if (/[\u0000-\u001F]/.test(segment)) {
            return "Key path contains invalid control characters.";
        }
    }

    return null;
}

/** All registry items whose keyPath fails validation. */
export function findInvalidKeyPathItems(config: RegConfig): { item: RegItem; error: string; }[] {
    const out: { item: RegItem; error: string; }[] = [];
    for (const group of config.groups) {
        for (const item of collectGroupItems(group)) {
            const error = validateItemKeyPath(item.keyPath);
            if (error) {
                out.push({ item, error });
            }
        }
    }
    return out;
}

export function itemHive(item: Pick<RegItem, "keyPath">): RegHive {
    return parseItemKeyPath(item.keyPath).hive;
}

/** Sub-key below the hive (no hive prefix). Empty when only the hive is set. */
export function itemSubKeyPath(item: Pick<RegItem, "keyPath">): string {
    return parseItemKeyPath(item.keyPath).subKey;
}

/** True when the path names a key under a hive (not hive-root alone). */
export function itemHasSubKey(item: Pick<RegItem, "keyPath">): boolean {
    return !!itemSubKeyPath(item);
}

/** Full short "HKCU\subkey" path, as used in reports and the regedit jump. */
export function fullKeyPath(item: Pick<RegItem, "keyPath">): string {
    return normalizeItemKeyPath(item.keyPath);
}

/** Long-hive form for .reg export: HKEY_CURRENT_USER\SOFTWARE\Vendor\Product */
export function formatItemKeyPath(item: Pick<RegItem, "keyPath">): string {
    const { hive, subKey } = parseItemKeyPath(item.keyPath);
    const long = HIVE_LONG_NAMES[hive];
    return subKey ? `${long}\\${subKey}` : long;
}

// ---------------------------------------------------------------------------
// Labels

/** Last segment of the sub-key, used when an item has no explicit name. */
export function keyLeafName(keyPath: string): string {
    const sub = itemSubKeyPath({ keyPath });
    if (!sub) {
        return "";
    }
    const parts = sub.split("\\");
    return parts[parts.length - 1] || sub;
}

/** Name shown for an item's value: the value name, or "(Default)". */
export function valueDisplayName(valueName: string): string {
    return valueName.trim() ? valueName : "(Default)";
}

/** Derived label used when the key has no custom name: its last path segment. */
export function derivedItemLabel(item: Pick<RegItem, "keyPath">): string {
    return keyLeafName(item.keyPath) || "(no key)";
}

export function itemLabel(item: Pick<RegItem, "keyPath" | "name">): string {
    const custom = item.name?.trim();
    if (custom) {
        return custom;
    }
    return derivedItemLabel(item);
}

/**
 * Report / progress label for one value: the key label alone when it holds a
 * single value, otherwise qualified with the value name.
 */
export function valueRefLabel({ item, value }: RegValueRef): string {
    const key = itemLabel(item);
    if ((item.values?.length ?? 0) < 2) {
        return key;
    }
    return `${key}\\${valueDisplayName(value.valueName)}`;
}
