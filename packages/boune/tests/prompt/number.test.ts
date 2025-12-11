import { type NumberOptions, buildHint, validateConstraints } from "../../src/prompt/number.ts";
import { describe, expect, test } from "bun:test";

describe("number prompt", () => {
  describe("validateConstraints", () => {
    test("accepts valid number", () => {
      expect(validateConstraints(42, { message: "" })).toBe(true);
    });

    test("enforces minimum", () => {
      expect(validateConstraints(5, { message: "", min: 10 })).toBe("Value must be at least 10");
      expect(validateConstraints(10, { message: "", min: 10 })).toBe(true);
      expect(validateConstraints(15, { message: "", min: 10 })).toBe(true);
    });

    test("enforces maximum", () => {
      expect(validateConstraints(100, { message: "", max: 50 })).toBe("Value must be at most 50");
      expect(validateConstraints(50, { message: "", max: 50 })).toBe(true);
      expect(validateConstraints(25, { message: "", max: 50 })).toBe(true);
    });

    test("enforces min and max range", () => {
      const opts: NumberOptions = { message: "", min: 1, max: 100 };
      expect(validateConstraints(0, opts)).toBe("Value must be at least 1");
      expect(validateConstraints(101, opts)).toBe("Value must be at most 100");
      expect(validateConstraints(50, opts)).toBe(true);
    });

    test("enforces integer constraint", () => {
      expect(validateConstraints(3.14, { message: "", integer: true })).toBe(
        "Please enter an integer",
      );
      expect(validateConstraints(3, { message: "", integer: true })).toBe(true);
      expect(validateConstraints(-5, { message: "", integer: true })).toBe(true);
    });

    test("combines all constraints", () => {
      const opts: NumberOptions = { message: "", min: 1, max: 65535, integer: true };
      expect(validateConstraints(8080, opts)).toBe(true);
      expect(validateConstraints(3.14, opts)).toBe("Please enter an integer");
      expect(validateConstraints(0, opts)).toBe("Value must be at least 1");
      expect(validateConstraints(70000, opts)).toBe("Value must be at most 65535");
    });
  });

  describe("buildHint", () => {
    test("returns empty string with no constraints", () => {
      expect(buildHint({ message: "" })).toBe("");
    });

    test("shows range when both min and max", () => {
      expect(buildHint({ message: "", min: 1, max: 100 })).toBe("1-100");
    });

    test("shows min only", () => {
      expect(buildHint({ message: "", min: 0 })).toBe("≥0");
    });

    test("shows max only", () => {
      expect(buildHint({ message: "", max: 65535 })).toBe("≤65535");
    });

    test("shows integer", () => {
      expect(buildHint({ message: "", integer: true })).toBe("integer");
    });

    test("combines range and integer", () => {
      expect(buildHint({ message: "", min: 1, max: 65535, integer: true })).toBe(
        "1-65535, integer",
      );
    });
  });
});
