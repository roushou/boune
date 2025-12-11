import {
  type Entry,
  filterEntries,
  isHidden,
  matchesExtension,
  sortEntries,
} from "../../src/prompt/filepath.ts";
import { describe, expect, test } from "bun:test";

describe("filepath prompt", () => {
  const entry = (name: string, isDirectory: boolean): Entry => ({
    name,
    isDirectory,
    fullPath: `/test/${name}`,
  });

  describe("filterEntries", () => {
    const entries: Entry[] = [
      entry("index.ts", false),
      entry("app.ts", false),
      entry("components", true),
      entry("utils", true),
      entry("config.json", false),
    ];

    test("returns all entries when input is empty", () => {
      expect(filterEntries(entries, "")).toHaveLength(5);
    });

    test("filters by substring match", () => {
      const filtered = filterEntries(entries, ".ts");
      expect(filtered).toHaveLength(2);
      expect(filtered.map((e) => e.name)).toContain("index.ts");
      expect(filtered.map((e) => e.name)).toContain("app.ts");
    });

    test("is case insensitive", () => {
      const filtered = filterEntries(entries, "INDEX");
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.name).toBe("index.ts");
    });

    test("filters directories too", () => {
      const filtered = filterEntries(entries, "comp");
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.name).toBe("components");
    });

    test("returns empty when no match", () => {
      const filtered = filterEntries(entries, "xyz");
      expect(filtered).toHaveLength(0);
    });
  });

  describe("sortEntries", () => {
    test("directories come first", () => {
      const entries: Entry[] = [entry("file.ts", false), entry("dir", true)];
      const sorted = sortEntries(entries);
      expect(sorted[0]?.name).toBe("dir");
      expect(sorted[1]?.name).toBe("file.ts");
    });

    test("sorts alphabetically within type", () => {
      const entries: Entry[] = [
        entry("zebra", true),
        entry("alpha", true),
        entry("zoo.ts", false),
        entry("app.ts", false),
      ];
      const sorted = sortEntries(entries);
      expect(sorted.map((e) => e.name)).toEqual(["alpha", "zebra", "app.ts", "zoo.ts"]);
    });

    test("does not mutate original array", () => {
      const entries: Entry[] = [entry("b", true), entry("a", true)];
      const sorted = sortEntries(entries);
      expect(entries[0]?.name).toBe("b");
      expect(sorted[0]?.name).toBe("a");
    });
  });

  describe("isHidden", () => {
    test("detects hidden files", () => {
      expect(isHidden(".gitignore")).toBe(true);
      expect(isHidden(".env")).toBe(true);
      expect(isHidden(".hidden")).toBe(true);
    });

    test("detects non-hidden files", () => {
      expect(isHidden("file.ts")).toBe(false);
      expect(isHidden("README.md")).toBe(false);
    });
  });

  describe("matchesExtension", () => {
    test("matches single extension", () => {
      expect(matchesExtension("file.ts", [".ts"])).toBe(true);
      expect(matchesExtension("file.js", [".ts"])).toBe(false);
    });

    test("matches multiple extensions", () => {
      expect(matchesExtension("file.ts", [".ts", ".tsx"])).toBe(true);
      expect(matchesExtension("file.tsx", [".ts", ".tsx"])).toBe(true);
      expect(matchesExtension("file.js", [".ts", ".tsx"])).toBe(false);
    });

    test("is case insensitive", () => {
      expect(matchesExtension("file.TS", [".ts"])).toBe(true);
      expect(matchesExtension("file.ts", [".TS"])).toBe(true);
    });

    test("handles files with multiple dots", () => {
      expect(matchesExtension("file.test.ts", [".ts"])).toBe(true);
      expect(matchesExtension("file.d.ts", [".ts"])).toBe(true);
    });
  });
});
