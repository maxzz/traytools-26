import { normalizeOptionalComment } from "@/components/2-main/a-shared/field-comment-utils";
import {
    type RegConfig,
    type RegEditorStore,
    type RegGroup,
    type RegItem,
    type RegNode,
    type RegSeparator,
    type RegValue,
    REG_VALUE_TYPES,
    derivedItemLabel,
    isRegGroup,
    isRegItem,
} from "./9-types-registry";

export function buildRegistryFileText(config: RegConfig): string {
    return normalizeFileText(JSON.stringify(config, jsonReplacer, 4));
}

/** Same formatting rules as the file, for one group / item / separator subtree. */
export function buildNodeFileText(node: RegNode): string {
    return normalizeFileText(JSON.stringify(node, jsonReplacer, 4));
}

/** Snapshot each node's file text under its runtime uid (for per-row dirty dots). */
export function collectNodeTextsByUid(config: RegConfig): Record<string, string> {
    const out: Record<string, string> = {};
    walkNodes(config.groups, (node) => {
        if (node.uid) {
            out[node.uid] = buildNodeFileText(node);
        }
    });
    return out;
}

export function captureBaselineNodes(store: RegEditorStore): void {
    store.baselineNodeTextByUid = collectNodeTextsByUid(store.config);
    store.dirtyUids = [];
}

function walkNodes(nodes: readonly RegNode[], visit: (node: RegNode) => void): void {
    for (const node of nodes) {
        visit(node);
        if (isRegGroup(node)) {
            walkNodes(node.items, visit);
        }
    }
}

function jsonReplacer(this: RegGroup | RegItem, key: string, value: unknown): unknown {
    if (key === "uid" || key === "hive" || key === "requireElevated") {
        // hive lives inside keyPath; requireElevated is no longer a setting.
        return undefined;
    }
    // "curr" is the default view; omit it so files stay uncluttered.
    if (key === "view") {
        return value === "32" || value === "64" ? value : undefined;
    }
    // Item names are optional: persist only when customized.
    if (key === "name" && isRegItem(this as RegNode)) {
        const custom = typeof value === "string" ? value.trim() : "";
        if (!custom || custom === derivedItemLabel(this as RegItem)) {
            return undefined;
        }
        return custom;
    }
    if (key === "comment") {
        return typeof value === "string" && value.trim() === "" ? undefined : value;
    }
    return value;
}

function normalizeFileText(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
}

export function syncDirty(store: RegEditorStore): void {
    const dirty = computeDirty(store);
    if (store.dirty !== dirty) {
        store.dirty = dirty;
    }
    const dirtyUids = computeDirtyUids(store);
    if (!sameUidList(store.dirtyUids, dirtyUids)) {
        store.dirtyUids = dirtyUids;
    }
}

function computeDirty(store: RegEditorStore): boolean {
    // Dirty means the live tree differs from the last load/save/import baseline —
    // not merely that no registry.json exists on disk yet.
    return buildRegistryFileText(store.config) !== store.baseline;
}

function computeDirtyUids(store: RegEditorStore): string[] {
    const dirtyUids: string[] = [];
    walkNodes(store.config.groups, (node) => {
        const uid = node.uid;
        if (!uid) {
            return;
        }
        const baselineText = store.baselineNodeTextByUid[uid];
        if (baselineText === undefined || baselineText !== buildNodeFileText(node)) {
            dirtyUids.push(uid);
        }
    });
    return dirtyUids;
}

function sameUidList(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

export function parseRegistryJson(text: string): RegConfig {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as RegConfig).groups)) {
        throw new Error("Invalid registry.json: expected { groups: [...] }");
    }
    return normalizeRegConfig(parsed as RegConfig);
}

/**
 * Bring a parsed config to the current shape in place. Also used for the local
 * storage copy, which may have been written by an older format.
 */
export function normalizeRegConfig(config: RegConfig): RegConfig {
    normalizeOptionalComment(config);
    config.groups = config.groups.map((group) => normalizeGroup(group));
    return config;
}

export function normalizeGroup(raw: unknown): RegGroup {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid registry.json: group must be an object");
    }
    const group = raw as RegGroup & { requireElevated?: unknown; };
    if (typeof group.name !== "string") {
        group.name = "Group";
    }
    normalizeOptionalComment(group);
    delete group.requireElevated;

    const children: RegNode[] = [];
    if (Array.isArray(group.items)) {
        for (const entry of group.items) {
            children.push(normalizeNode(entry));
        }
    }
    group.items = children;
    return group;
}

function normalizeNode(raw: unknown): RegNode {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid registry.json: item must be an object");
    }
    const node = raw as RegNode & { items?: unknown; keyPath?: unknown; separator?: unknown; };
    if (node.separator === true) {
        return normalizeSeparator(node);
    }
    // Nested group: has items[] and is not a registry item.
    if (Array.isArray(node.items) && !("keyPath" in node)) {
        return normalizeGroup(node);
    }
    return normalizeItem(node);
}

function normalizeSeparator(raw: object): RegSeparator {
    const separator: RegSeparator = { separator: true };
    const comment = typeof (raw as RegSeparator).comment === "string" ? (raw as RegSeparator).comment : undefined;
    if (comment !== undefined) {
        separator.comment = comment;
        normalizeOptionalComment(separator);
    }
    return separator;
}

function normalizeItem(raw: object): RegItem {
    const item = raw as RegItem & LegacyValueFields & { hive?: unknown; requireElevated?: unknown; };
    // Keep the author's spelling (HKLM vs HKEY_LOCAL_MACHINE, \\ vs \, / vs \).
    // Ops normalize via parseItemKeyPath / normalizeItemKeyPath at use time.
    item.keyPath = typeof item.keyPath === "string" && item.keyPath.length > 0 ? item.keyPath : "HKCU";
    // Hive is part of keyPath; drop any leftover separate field.
    delete item.hive;
    delete item.requireElevated;
    item.values = normalizeValues(item);
    if (item.view !== "32" && item.view !== "64") {
        delete item.view;
    }

    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (name && name !== derivedItemLabel(item)) {
        item.name = name;
    } else {
        delete item.name;
    }
    normalizeOptionalComment(item);
    // Items must not carry a nested items array.
    if ("items" in item) {
        delete (item as { items?: unknown; }).items;
    }
    return item;
}

/** Pre-`values` files put a single value's fields directly on the key. */
type LegacyValueFields = {
    valueName?: unknown;
    valueType?: unknown;
    newValue?: unknown;
};

/**
 * Read the `values` array, upgrading files written before a key could hold more
 * than one value. Every key ends up with at least one value row.
 */
function normalizeValues(raw: RegItem & LegacyValueFields): RegValue[] {
    const listed: unknown[] = Array.isArray(raw.values) ? raw.values : [];
    const values = listed
        .filter((entry): entry is object => !!entry && typeof entry === "object")
        .map((entry) => normalizeValue(entry));

    if (!values.length) {
        values.push(normalizeValue({
            valueName: raw.valueName,
            valueType: raw.valueType,
            newValue: raw.newValue,
        }));
    }

    delete raw.valueName;
    delete raw.valueType;
    delete raw.newValue;
    return values;
}

function normalizeValue(raw: object): RegValue {
    const value = raw as RegValue;
    return {
        valueName: typeof value.valueName === "string" ? value.valueName : "",
        valueType: REG_VALUE_TYPES.includes(value.valueType) ? value.valueType : "REG_SZ",
        newValue: typeof value.newValue === "string" ? value.newValue : "",
    };
}
