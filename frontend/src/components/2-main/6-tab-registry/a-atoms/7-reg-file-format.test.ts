import { describe, expect, it } from "vitest";
import {
    type RegGroup,
    type RegItem,
    type RegValueRef,
    itemHive,
    itemSubKeyPath,
    itemValueRefs,
} from "./9-types-registry";
import { buildRegFileText, parseRegFile } from "./7-reg-file-format";

/** Wrap flat items in a nameless group so buildRegFileText can walk them. */
function asGroups(items: readonly RegItem[], name = ""): RegGroup[] {
    return [{ name, items: [...items] }];
}

/** Sample covering every value form regedit emits, including wrapped hex. */
const SAMPLE = [
    "Windows Registry Editor Version 5.00",
    "",
    "[HKEY_CURRENT_USER\\SOFTWARE\\Traytools\\Sample]",
    '"Text"="plain value"',
    '"Quoted"="say \\"hi\\" C:\\\\dir\\\\"',
    '@="default value"',
    '"Num"=dword:0000002a',
    '"Big"=hex(b):ef,cd,ab,90,78,56,34,12',
    '"Blob"=hex:de,ad,be,ef',
    '"Expand"=hex(2):25,00,53,00,79,00,73,00,74,00,65,00,6d,00,52,00,6f,00,6f,00,\\',
    "  74,00,25,00,00,00",
    '"Multi"=hex(7):61,00,00,00,62,00,00,00,00,00',
    '"Gone"=-',
    "",
    "[-HKEY_CURRENT_USER\\SOFTWARE\\Traytools\\Removed]",
    "",
    "[HKEY_LOCAL_MACHINE\\SOFTWARE\\Traytools\\Other]",
    '"Flag"=dword:00000001',
].join("\r\n");

/** All values of a parsed group, paired with the key that owns them. */
function valueRefs(items: readonly RegItem[]): RegValueRef[] {
    return items.flatMap(itemValueRefs);
}

describe("parseRegFile", () => {
    const { group, warnings } = parseRegFile(SAMPLE, "sample");
    const items = group.items as RegItem[];

    function byName(name: string): RegValueRef {
        const found = valueRefs(items).find((ref) => ref.value.valueName === name);
        if (!found) {
            throw new Error(`No parsed value named "${name}"`);
        }
        return found;
    }

    it("names the group after the file and makes one item per key", () => {
        expect(group.name).toBe("sample");
        expect(items).toHaveLength(2);
        expect(items[0].values).toHaveLength(8);
        expect(items[1].values).toHaveLength(1);
    });

    it("reads strings, unescaping quotes and backslashes", () => {
        expect(byName("Text").value.newValue).toBe("plain value");
        expect(byName("Quoted").value.newValue).toBe('say "hi" C:\\dir\\');
    });

    it("treats @ as the (Default) value", () => {
        const def = byName("").value;
        expect(def.valueType).toBe("REG_SZ");
        expect(def.newValue).toBe("default value");
    });

    it("converts dword and qword hex payloads to decimal", () => {
        expect(byName("Num").value.valueType).toBe("REG_DWORD");
        expect(byName("Num").value.newValue).toBe("42");
        expect(byName("Big").value.valueType).toBe("REG_QWORD");
        expect(byName("Big").value.newValue).toBe("1311768467294899695");
    });

    it("keeps binary as comma-separated hex", () => {
        expect(byName("Blob").value.valueType).toBe("REG_BINARY");
        expect(byName("Blob").value.newValue).toBe("de,ad,be,ef");
    });

    it("decodes UTF-16LE payloads, including across a line continuation", () => {
        expect(byName("Expand").value.valueType).toBe("REG_EXPAND_SZ");
        expect(byName("Expand").value.newValue).toBe("%SystemRoot%");
    });

    it("splits multi-strings onto separate lines", () => {
        expect(byName("Multi").value.valueType).toBe("REG_MULTI_SZ");
        expect(byName("Multi").value.newValue).toBe("a\nb");
    });

    it("stores hive as part of keyPath", () => {
        expect(byName("Text").item.keyPath).toBe("HKCU\\SOFTWARE\\Traytools\\Sample");
        expect(itemHive(byName("Text").item)).toBe("HKCU");
        expect(itemSubKeyPath(byName("Text").item)).toBe("SOFTWARE\\Traytools\\Sample");
        expect(byName("Flag").item.keyPath).toBe("HKLM\\SOFTWARE\\Traytools\\Other");
        expect(itemHive(byName("Flag").item)).toBe("HKLM");
    });

    it("keeps every value of one key on the same item", () => {
        expect(byName("Text").item).toBe(byName("Multi").item);
        expect(byName("Text").item).not.toBe(byName("Flag").item);
    });

    it("warns about deletions instead of importing them", () => {
        expect(warnings).toHaveLength(2);
        expect(warnings.join("\n")).toContain("Key deletion not supported");
        expect(warnings.join("\n")).toContain("Value deletion not supported");
    });

    it("marks machine-wide hives as needing elevation", () => {
        expect(byName("Text").item.requireElevated).toBe(false);
        expect(byName("Flag").item.requireElevated).toBe(true);
    });

    it("merges a key that appears in more than one section", () => {
        const parsed = parseRegFile(
            '[HKCU\\Foo]\r\n"A"="1"\r\n\r\n[HKCU\\Bar]\r\n"B"="2"\r\n\r\n[HKCU\\Foo]\r\n"C"="3"\r\n',
            "merge",
        );
        const merged = parsed.group.items as RegItem[];
        expect(merged).toHaveLength(2);
        expect(merged[0].values.map((v) => v.valueName)).toEqual(["A", "C"]);
    });

    it("ignores key sections that declare no values", () => {
        const parsed = parseRegFile("[HKCU\\Empty]\r\n", "empty");
        expect(parsed.group.items).toHaveLength(0);
    });

    it("accepts the legacy REGEDIT4 header", () => {
        const legacy = parseRegFile('REGEDIT4\r\n\r\n[HKEY_USERS\\Foo]\r\n"A"="b"\r\n', "legacy");
        expect(legacy.group.items).toHaveLength(1);
        expect((legacy.group.items[0] as RegItem).keyPath).toBe("HKU\\Foo");
    });

    it("does not mistake a trailing backslash in a path for a continuation", () => {
        const parsed = parseRegFile('[HKCU\\Foo]\r\n"Dir"="C:\\\\temp\\\\"\r\n"Next"="ok"\r\n', "paths");
        const values = (parsed.group.items[0] as RegItem).values;
        expect(values).toHaveLength(2);
        expect(values[0].newValue).toBe("C:\\temp\\");
    });
});

describe("buildRegFileText", () => {
    it("round-trips every value type back through the parser", () => {
        const original = valueRefs(parseRegFile(SAMPLE, "sample").group.items as RegItem[]);
        const text = buildRegFileText(asGroups(parseRegFile(SAMPLE, "sample").group.items as RegItem[]));
        const reparsed = valueRefs(parseRegFile(text, "sample").group.items as RegItem[]);

        expect(reparsed).toHaveLength(original.length);
        for (let i = 0; i < original.length; i++) {
            expect({
                keyPath: reparsed[i].item.keyPath,
                valueName: reparsed[i].value.valueName,
                valueType: reparsed[i].value.valueType,
                newValue: reparsed[i].value.newValue,
            }).toEqual({
                keyPath: original[i].item.keyPath,
                valueName: original[i].value.valueName,
                valueType: original[i].value.valueType,
                newValue: original[i].value.newValue,
            });
        }
    });

    it("writes the 5.00 header and long hive names", () => {
        const text = buildRegFileText(asGroups(parseRegFile(SAMPLE, "sample").group.items as RegItem[]));
        expect(text.startsWith("Windows Registry Editor Version 5.00")).toBe(true);
        expect(text).toContain("[HKEY_CURRENT_USER\\SOFTWARE\\Traytools\\Sample]");
        expect(text).toContain("[HKEY_LOCAL_MACHINE\\SOFTWARE\\Traytools\\Other]");
        // One item per key from the sample — each appears once.
        expect(text.split("[HKEY_CURRENT_USER").length - 1).toBe(1);
    });

    it("emits the (Default) value as @", () => {
        const text = buildRegFileText(asGroups(parseRegFile(SAMPLE, "sample").group.items as RegItem[]));
        expect(text).toContain('@="default value"');
    });

    it("keeps sibling items separate even when they share a key path", () => {
        const items: RegItem[] = [
            { keyPath: "HKCU\\Foo", name: "First", values: [{ valueName: "A", valueType: "REG_SZ", newValue: "1" }] },
            { keyPath: "HKCU\\Foo", name: "Second", values: [{ valueName: "B", valueType: "REG_SZ", newValue: "2" }] },
        ];
        const text = buildRegFileText(asGroups(items));
        expect(text.split("[HKEY_CURRENT_USER\\Foo]").length - 1).toBe(2);
        expect(text).toContain("; First");
        expect(text).toContain("; Second");
        expect(text).toContain('"A"="1"');
        expect(text).toContain('"B"="2"');
    });

    it("emits group and child names as comments", () => {
        const groups: RegGroup[] = [
            {
                name: "Parent",
                items: [
                    {
                        name: "Alpha",
                        items: [
                            {
                                keyPath: "HKCU\\Foo",
                                name: "Key A",
                                values: [
                                    { valueName: "A", valueType: "REG_SZ", newValue: "1" },
                                    { valueName: "C", valueType: "REG_SZ", newValue: "3" },
                                ],
                            },
                        ],
                    },
                    {
                        name: "Beta",
                        items: [
                            {
                                keyPath: "HKCU\\Foo",
                                name: "Key B",
                                values: [{ valueName: "B", valueType: "REG_SZ", newValue: "2" }],
                            },
                        ],
                    },
                ],
            },
        ];
        const text = buildRegFileText(groups);
        expect(text).toContain("; Group: Parent");
        expect(text).toContain("; Group: Alpha");
        expect(text).toContain("; Key A");
        expect(text).toContain("; Group: Beta");
        expect(text).toContain("; Key B");
        // Same key path once per child — not merged.
        expect(text.split("[HKEY_CURRENT_USER\\Foo]").length - 1).toBe(2);
        expect(text.indexOf("; Key A")).toBeLessThan(text.indexOf('"A"="1"'));
        expect(text.indexOf('"A"="1"')).toBeLessThan(text.indexOf('"C"="3"'));
        expect(text.indexOf('"C"="3"')).toBeLessThan(text.indexOf("; Group: Beta"));
        expect(text.indexOf("; Key B")).toBeLessThan(text.indexOf('"B"="2"'));
        // One blank line after each group before the next group comment.
        expect(text).toMatch(/"C"="3"\n\n; Group: Beta/);
    });

    it("uses the key leaf as the child comment when no custom name is set", () => {
        const items: RegItem[] = [
            { keyPath: "HKCU\\SOFTWARE\\_tm_test", values: [{ valueName: "", valueType: "REG_SZ", newValue: "x" }] },
        ];
        expect(buildRegFileText(asGroups(items))).toContain("; _tm_test");
    });

    it("skips items that have no key path", () => {
        const item: RegItem = {
            keyPath: "HKCU",
            values: [{ valueName: "X", valueType: "REG_SZ", newValue: "y" }],
        };
        expect(buildRegFileText(asGroups([item]))).not.toContain("HKEY_CURRENT_USER");
    });

    it("accepts 0x-prefixed numbers for DWORD and QWORD", () => {
        const items: RegItem[] = [
            {
                keyPath: "HKCU\\Foo",
                values: [
                    { valueName: "D", valueType: "REG_DWORD", newValue: "0x1f" },
                    { valueName: "Q", valueType: "REG_QWORD", newValue: "0x1f" },
                ],
            },
        ];
        const reparsed = valueRefs(parseRegFile(buildRegFileText(asGroups(items)), "x").group.items as RegItem[]);
        expect(reparsed[0].value.newValue).toBe("31");
        expect(reparsed[1].value.newValue).toBe("31");
    });
});
