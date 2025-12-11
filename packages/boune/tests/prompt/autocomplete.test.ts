import { type AutocompleteOption, defaultFilter } from "../../src/prompt/autocomplete.ts";
import { describe, expect, test } from "bun:test";

describe("autocomplete prompt", () => {
  describe("defaultFilter (fuzzy match)", () => {
    const opt = (label: string): AutocompleteOption => ({ label, value: label.toLowerCase() });

    test("matches all when input is empty", () => {
      expect(defaultFilter("", opt("React"))).toBe(true);
      expect(defaultFilter("", opt("Vue"))).toBe(true);
    });

    test("matches exact substring", () => {
      expect(defaultFilter("rea", opt("React"))).toBe(true);
      expect(defaultFilter("vue", opt("Vue"))).toBe(true);
    });

    test("matches fuzzy characters in order", () => {
      expect(defaultFilter("rct", opt("React"))).toBe(true);
      expect(defaultFilter("ang", opt("Angular"))).toBe(true);
    });

    test("is case insensitive", () => {
      expect(defaultFilter("REACT", opt("React"))).toBe(true);
      expect(defaultFilter("react", opt("REACT"))).toBe(true);
    });

    test("rejects non-matching input", () => {
      expect(defaultFilter("xyz", opt("React"))).toBe(false);
      expect(defaultFilter("rxe", opt("React"))).toBe(false);
    });

    test("filters list of options", () => {
      const options = [opt("React"), opt("Vue"), opt("Svelte"), opt("Angular")];
      const filtered = options.filter((o) => defaultFilter("re", o));
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.label).toBe("React");
    });

    test("matches multiple options with common pattern", () => {
      const options = [opt("JavaScript"), opt("TypeScript"), opt("Java")];
      const filtered = options.filter((o) => defaultFilter("ja", o));
      expect(filtered).toHaveLength(2);
      expect(filtered.map((o) => o.label)).toContain("JavaScript");
      expect(filtered.map((o) => o.label)).toContain("Java");
    });
  });
});
