import { describe, expect, test } from "bun:test";
import { createListSchema } from "../../src/prompt/list.ts";

describe("list prompt", () => {
  describe("parsing", () => {
    test("parses comma-separated values", () => {
      const schema = createListSchema({ message: "Enter items:" });
      const result = schema.parse("a, b, c", false);
      expect(result).toEqual({ ok: true, value: ["a", "b", "c"] });
    });

    test("trims whitespace by default", () => {
      const schema = createListSchema({ message: "Enter items:" });
      const result = schema.parse("  foo  ,  bar  ,  baz  ", false);
      expect(result).toEqual({ ok: true, value: ["foo", "bar", "baz"] });
    });

    test("filters empty items by default", () => {
      const schema = createListSchema({ message: "Enter items:" });
      const result = schema.parse("a,,b,,,c", false);
      expect(result).toEqual({ ok: true, value: ["a", "b", "c"] });
    });

    test("respects custom separator", () => {
      const schema = createListSchema({ message: "Enter paths:", separator: ":" });
      const result = schema.parse("/usr/bin:/usr/local/bin:/opt/bin", false);
      expect(result).toEqual({ ok: true, value: ["/usr/bin", "/usr/local/bin", "/opt/bin"] });
    });

    test("can disable trimming", () => {
      const schema = createListSchema({ message: "Enter items:", trim: false });
      const result = schema.parse(" a , b ", false);
      expect(result).toEqual({ ok: true, value: [" a ", " b "] });
    });

    test("can disable empty filtering", () => {
      const schema = createListSchema({ message: "Enter items:", filterEmpty: false, trim: false });
      const result = schema.parse("a,,b", false);
      expect(result).toEqual({ ok: true, value: ["a", "", "b"] });
    });

    test("returns empty array for empty input", () => {
      const schema = createListSchema({ message: "Enter items:" });
      const result = schema.parse("", true);
      expect(result).toEqual({ ok: true, value: [] });
    });

    test("uses default value for empty input", () => {
      const schema = createListSchema({
        message: "Enter items:",
        default: ["x", "y"],
      });
      const result = schema.parse("", true);
      expect(result).toEqual({ ok: true, value: ["x", "y"] });
    });
  });

  describe("constraints", () => {
    test("enforces minimum items", () => {
      const schema = createListSchema({ message: "Enter items:", min: 2 });
      const result = schema.parse("a", false);
      expect(result).toEqual({ ok: false, error: "Please enter at least 2 item(s)" });
    });

    test("passes when meeting minimum", () => {
      const schema = createListSchema({ message: "Enter items:", min: 2 });
      const result = schema.parse("a,b", false);
      expect(result).toEqual({ ok: true, value: ["a", "b"] });
    });

    test("enforces maximum items", () => {
      const schema = createListSchema({ message: "Enter items:", max: 2 });
      const result = schema.parse("a,b,c", false);
      expect(result).toEqual({ ok: false, error: "Please enter at most 2 item(s)" });
    });

    test("passes when under maximum", () => {
      const schema = createListSchema({ message: "Enter items:", max: 3 });
      const result = schema.parse("a,b", false);
      expect(result).toEqual({ ok: true, value: ["a", "b"] });
    });

    test("requires minimum items on empty input", () => {
      const schema = createListSchema({ message: "Enter items:", min: 1 });
      const result = schema.parse("", true);
      expect(result).toEqual({ ok: false, error: "Please enter at least 1 item(s)" });
    });
  });

  describe("item validation", () => {
    test("validates individual items", () => {
      const schema = createListSchema({
        message: "Enter emails:",
        validateItem: (item) => (item.includes("@") ? true : `"${item}" is not a valid email`),
      });

      const validResult = schema.parse("a@b.com,c@d.com", false);
      expect(validResult).toEqual({ ok: true, value: ["a@b.com", "c@d.com"] });

      const invalidResult = schema.parse("a@b.com,invalid", false);
      expect(invalidResult).toEqual({ ok: false, error: '"invalid" is not a valid email' });
    });
  });

  describe("hint", () => {
    test("shows comma-separated by default", () => {
      const schema = createListSchema({ message: "Enter items:" });
      expect(schema.hint?.()).toBe("comma-separated");
    });

    test("shows custom separator", () => {
      const schema = createListSchema({ message: "Enter items:", separator: ":" });
      expect(schema.hint?.()).toBe('separated by ":"');
    });

    test("shows min constraint", () => {
      const schema = createListSchema({ message: "Enter items:", min: 2 });
      expect(schema.hint?.()).toBe("comma-separated, min 2");
    });

    test("shows max constraint", () => {
      const schema = createListSchema({ message: "Enter items:", max: 5 });
      expect(schema.hint?.()).toBe("comma-separated, max 5");
    });

    test("shows range constraint", () => {
      const schema = createListSchema({ message: "Enter items:", min: 1, max: 3 });
      expect(schema.hint?.()).toBe("comma-separated, 1-3 items");
    });
  });
});
