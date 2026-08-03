import { describe, expect, it } from "vitest";
import { type RegItem, itemHive, itemSubKeyPath } from "./9-types-registry";
import { buildRegFileText, parseRegFile } from "./7-reg-file-format";

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

describe("parseRegFile", () => {
    const { group, warnings } = parseRegFile(SAMPLE, "sample");

    function byName(name: string): RegItem {
        const found = group.items.find((n) => (n as RegItem).valueName === name) as RegItem | undefined;
        if (!found) {
            throw new Error(`No parsed value named "${name}"`);
        }
        return found;
    }

    it("names the group after the file and keeps every supported value", () => {
        expect(group.name).toBe("sample");
        expect(group.items).toHaveLength(9);
    });

    it("reads strings, unescaping quotes and backslashes", () => {
        expect(byName("Text").newValue).toBe("plain value");
        expect(byName("Quoted").newValue).toBe('say "hi" C:\\dir\\');
    });

    it("treats @ as the (Default) value", () => {
        const def = byName("");
        expect(def.valueType).toBe("REG_SZ");
        expect(def.newValue).toBe("default value");
    });

    it("converts dword and qword hex payloads to decimal", () => {
        expect(byName("Num").valueType).toBe("REG_DWORD");
        expect(byName("Num").newValue).toBe("42");
        expect(byName("Big").valueType).toBe("REG_QWORD");
        expect(byName("Big").newValue).toBe("1311768467294899695");
    });

    it("keeps binary as comma-separated hex", () => {
        expect(byName("Blob").valueType).toBe("REG_BINARY");
        expect(byName("Blob").newValue).toBe("de,ad,be,ef");
    });

    it("decodes UTF-16LE payloads, including across a line continuation", () => {
        expect(byName("Expand").valueType).toBe("REG_EXPAND_SZ");
        expect(byName("Expand").newValue).toBe("%SystemRoot%");
    });

    it("splits multi-strings onto separate lines", () => {
        expect(byName("Multi").valueType).toBe("REG_MULTI_SZ");
        expect(byName("Multi").newValue).toBe("a\nb");
    });

    it("stores hive as part of keyPath", () => {
        expect(byName("Text").keyPath).toBe("HKCU\\SOFTWARE\\Traytools\\Sample");
        expect(itemHive(byName("Text"))).toBe("HKCU");
        expect(itemSubKeyPath(byName("Text"))).toBe("SOFTWARE\\Traytools\\Sample");
        expect(byName("Flag").keyPath).toBe("HKLM\\SOFTWARE\\Traytools\\Other");
        expect(itemHive(byName("Flag"))).toBe("HKLM");
    });

    it("warns about deletions instead of importing them", () => {
        expect(warnings).toHaveLength(2);
        expect(warnings.join("\n")).toContain("Key deletion not supported");
        expect(warnings.join("\n")).toContain("Value deletion not supported");
    });

    it("marks machine-wide hives as needing elevation", () => {
        expect(byName("Text").requireElevated).toBe(false);
        expect(byName("Flag").requireElevated).toBe(true);
    });

    it("accepts the legacy REGEDIT4 header", () => {
        const legacy = parseRegFile('REGEDIT4\r\n\r\n[HKEY_USERS\\Foo]\r\n"A"="b"\r\n', "legacy");
        expect(legacy.group.items).toHaveLength(1);
        expect((legacy.group.items[0] as RegItem).keyPath).toBe("HKU\\Foo");
    });

    it("does not mistake a trailing backslash in a path for a continuation", () => {
        const parsed = parseRegFile('[HKCU\\Foo]\r\n"Dir"="C:\\\\temp\\\\"\r\n"Next"="ok"\r\n', "paths");
        expect(parsed.group.items).toHaveLength(2);
        expect((parsed.group.items[0] as RegItem).newValue).toBe("C:\\temp\\");
    });
});

describe("buildRegFileText", () => {
    it("round-trips every value type back through the parser", () => {
        const original = parseRegFile(SAMPLE, "sample").group.items as RegItem[];
        const reparsed = parseRegFile(buildRegFileText(original), "sample").group.items as RegItem[];

        expect(reparsed).toHaveLength(original.length);
        for (let i = 0; i < original.length; i++) {
            expect({
                keyPath: reparsed[i].keyPath,
                valueName: reparsed[i].valueName,
                valueType: reparsed[i].valueType,
                newValue: reparsed[i].newValue,
            }).toEqual({
                keyPath: original[i].keyPath,
                valueName: original[i].valueName,
                valueType: original[i].valueType,
                newValue: original[i].newValue,
            });
        }
    });

    it("writes the 5.00 header and long hive names, grouping by key", () => {
        const text = buildRegFileText(parseRegFile(SAMPLE, "sample").group.items as RegItem[]);
        expect(text.startsWith("Windows Registry Editor Version 5.00")).toBe(true);
        expect(text).toContain("[HKEY_CURRENT_USER\\SOFTWARE\\Traytools\\Sample]");
        expect(text).toContain("[HKEY_LOCAL_MACHINE\\SOFTWARE\\Traytools\\Other]");
        // Eight values share one key, so that section header appears exactly once.
        expect(text.split("[HKEY_CURRENT_USER").length - 1).toBe(1);
    });

    it("emits the (Default) value as @", () => {
        const text = buildRegFileText(parseRegFile(SAMPLE, "sample").group.items as RegItem[]);
        expect(text).toContain('@="default value"');
    });

    it("skips items that have no key path", () => {
        const item: RegItem = {
            keyPath: "HKCU", valueName: "X", valueType: "REG_SZ", newValue: "y",
        };
        expect(buildRegFileText([item])).not.toContain("HKEY_CURRENT_USER");
    });

    it("accepts 0x-prefixed numbers for DWORD and QWORD", () => {
        const items: RegItem[] = [
            { keyPath: "HKCU\\Foo", valueName: "D", valueType: "REG_DWORD", newValue: "0x1f" },
            { keyPath: "HKCU\\Foo", valueName: "Q", valueType: "REG_QWORD", newValue: "0x1f" },
        ];
        const reparsed = parseRegFile(buildRegFileText(items), "x").group.items as RegItem[];
        expect(reparsed[0].newValue).toBe("31");
        expect(reparsed[1].newValue).toBe("31");
    });
});
