import { describe, expect, it } from "vitest";
import { type RegItem } from "./9-types-registry";
import { buildRegistryFileText, parseRegistryJson } from "./6-json-serialize-dirty";

function firstItem(text: string): RegItem {
    const config = parseRegistryJson(text);
    return config.groups[0].items[0] as RegItem;
}

describe("parseRegistryJson value migration", () => {
    it("wraps a legacy flat item into a single value row", () => {
        const item = firstItem(JSON.stringify({
            groups: [{
                name: "G",
                items: [{
                    keyPath: "HKLM\\SOFTWARE\\Sample",
                    valueName: "Flag",
                    valueType: "REG_DWORD",
                    newValue: "1",
                }],
            }],
        }));

        expect(item.values).toEqual([{ valueName: "Flag", valueType: "REG_DWORD", newValue: "1" }]);
        expect("valueName" in item).toBe(false);
        expect("valueType" in item).toBe(false);
        expect("newValue" in item).toBe(false);
    });

    it("keeps a values array and drops leftover flat fields", () => {
        const item = firstItem(JSON.stringify({
            groups: [{
                name: "G",
                items: [{
                    keyPath: "HKCU\\Sample",
                    valueName: "Stale",
                    values: [
                        { valueName: "A", valueType: "REG_SZ", newValue: "one" },
                        { valueName: "", valueType: "REG_DWORD", newValue: "2" },
                    ],
                }],
            }],
        }));

        expect(item.values.map((v) => v.valueName)).toEqual(["A", ""]);
        expect("valueName" in item).toBe(false);
    });

    it("gives a key with no values one empty string row", () => {
        const item = firstItem(JSON.stringify({
            groups: [{ name: "G", items: [{ keyPath: "HKCU\\Sample", values: [] }] }],
        }));

        expect(item.values).toEqual([{ valueName: "", valueType: "REG_SZ", newValue: "" }]);
    });

    it("falls back to REG_SZ for an unknown value type", () => {
        const item = firstItem(JSON.stringify({
            groups: [{
                name: "G",
                items: [{ keyPath: "HKCU\\Sample", values: [{ valueName: "X", valueType: "REG_WAT", newValue: "y" }] }],
            }],
        }));

        expect(item.values[0].valueType).toBe("REG_SZ");
    });
});

describe("buildRegistryFileText", () => {
    it("persists values without runtime uids and without flat fields", () => {
        const config = parseRegistryJson(JSON.stringify({
            groups: [{
                name: "G",
                items: [{
                    keyPath: "HKCU\\Sample",
                    valueName: "Flag",
                    valueType: "REG_DWORD",
                    newValue: "1",
                }],
            }],
        }));
        config.groups[0].items[0].uid = "r1";
        (config.groups[0].items[0] as RegItem).values[0].uid = "r2";

        const text = buildRegistryFileText(config);

        expect(text).not.toContain("uid");
        expect(text).toContain("\"values\"");
        expect(JSON.parse(text)).toEqual({
            groups: [{
                name: "G",
                items: [{
                    keyPath: "HKCU\\Sample",
                    values: [{ valueName: "Flag", valueType: "REG_DWORD", newValue: "1" }],
                }],
            }],
        });
    });

    it("keeps a custom display name but omits one equal to the key leaf", () => {
        const config = parseRegistryJson(JSON.stringify({
            groups: [{
                name: "G",
                items: [
                    { keyPath: "HKCU\\Alpha", name: "Alpha", values: [] },
                    { keyPath: "HKCU\\Beta", name: "My beta", values: [] },
                ],
            }],
        }));

        const written = JSON.parse(buildRegistryFileText(config)) as {
            groups: { items: { name?: string; }[]; }[];
        };
        expect(written.groups[0].items[0].name).toBeUndefined();
        expect(written.groups[0].items[1].name).toBe("My beta");
    });
});
