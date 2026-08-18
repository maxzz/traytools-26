import { describe, expect, it } from "vitest";
import { dropMru, parseMruList, pushMru } from "./3-combo-mru";

describe("parseMruList", () => {
    it("returns empty for non-arrays", () => {
        expect(parseMruList(undefined)).toEqual([]);
        expect(parseMruList("nope")).toEqual([]);
        expect(parseMruList({ a: 1 })).toEqual([]);
    });

    it("trims, drops blanks and duplicates, and caps length", () => {
        expect(parseMruList(["  a  ", "", "a", "b", 1, "c", "d"], 3)).toEqual(["a", "b", "c"]);
    });
});

describe("pushMru", () => {
    it("ignores blank values", () => {
        expect(pushMru(["a"], "  ")).toEqual(["a"]);
    });

    it("moves an existing value to the front", () => {
        expect(pushMru(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
    });

    it("inserts a new value at the front and caps the list", () => {
        expect(pushMru(["b", "c"], "a", 2)).toEqual(["a", "b"]);
    });
});

describe("dropMru", () => {
    it("removes a matching value", () => {
        expect(dropMru(["a", "b"], "a")).toEqual(["b"]);
        expect(dropMru(["a", "b"], "c")).toEqual(["a", "b"]);
    });
});
