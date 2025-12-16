import type {
  BooleanValidationRules,
  NumberValidationRules,
  StringValidationRules,
} from "../src/validation/types.ts";
import { describe, expect, test } from "bun:test";
import { compileValidation } from "../src/validation/compile.ts";

describe("String validation", () => {
  describe("email", () => {
    test("accepts valid email", () => {
      const validate = compileValidation({ email: true }, "string");
      expect(validate("test@example.com")).toBe(true);
      expect(validate("user.name@domain.co.uk")).toBe(true);
    });

    test("rejects invalid email", () => {
      const validate = compileValidation({ email: true }, "string");
      expect(validate("invalid")).toBe("Must be a valid email address");
      expect(validate("@example.com")).toBe("Must be a valid email address");
      expect(validate("test@")).toBe("Must be a valid email address");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { email: { value: true, message: "Please enter a valid email" } },
        "string",
      );
      expect(validate("invalid")).toBe("Please enter a valid email");
    });
  });

  describe("url", () => {
    test("accepts valid URL", () => {
      const validate = compileValidation({ url: true }, "string");
      expect(validate("https://example.com")).toBe(true);
      expect(validate("http://localhost:3000")).toBe(true);
      expect(validate("ftp://files.example.com/path")).toBe(true);
    });

    test("rejects invalid URL", () => {
      const validate = compileValidation({ url: true }, "string");
      expect(validate("not-a-url")).toBe("Must be a valid URL");
      expect(validate("example.com")).toBe("Must be a valid URL");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { url: { value: true, message: "Invalid URL format" } },
        "string",
      );
      expect(validate("invalid")).toBe("Invalid URL format");
    });
  });

  describe("regex", () => {
    test("accepts matching pattern", () => {
      const validate = compileValidation({ regex: /^[a-z]+$/ }, "string");
      expect(validate("hello")).toBe(true);
      expect(validate("world")).toBe(true);
    });

    test("rejects non-matching pattern", () => {
      const validate = compileValidation({ regex: /^[a-z]+$/ }, "string");
      expect(validate("Hello")).toContain("Must match pattern");
      expect(validate("123")).toContain("Must match pattern");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { regex: { value: /^[a-z]+$/, message: "Only lowercase letters allowed" } },
        "string",
      );
      expect(validate("ABC")).toBe("Only lowercase letters allowed");
    });
  });

  describe("minLength", () => {
    test("accepts string at or above minimum", () => {
      const validate = compileValidation({ minLength: 3 }, "string");
      expect(validate("abc")).toBe(true);
      expect(validate("abcd")).toBe(true);
    });

    test("rejects string below minimum", () => {
      const validate = compileValidation({ minLength: 3 }, "string");
      expect(validate("ab")).toBe("Must be at least 3 characters");
      expect(validate("")).toBe("Must be at least 3 characters");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { minLength: { value: 5, message: "Too short!" } },
        "string",
      );
      expect(validate("hi")).toBe("Too short!");
    });
  });

  describe("maxLength", () => {
    test("accepts string at or below maximum", () => {
      const validate = compileValidation({ maxLength: 5 }, "string");
      expect(validate("hello")).toBe(true);
      expect(validate("hi")).toBe(true);
    });

    test("rejects string above maximum", () => {
      const validate = compileValidation({ maxLength: 5 }, "string");
      expect(validate("hello!")).toBe("Must be at most 5 characters");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { maxLength: { value: 3, message: "Too long!" } },
        "string",
      );
      expect(validate("hello")).toBe("Too long!");
    });
  });

  describe("oneOf", () => {
    test("accepts value in list", () => {
      const validate = compileValidation({ oneOf: ["dev", "staging", "prod"] }, "string");
      expect(validate("dev")).toBe(true);
      expect(validate("prod")).toBe(true);
    });

    test("rejects value not in list", () => {
      const validate = compileValidation({ oneOf: ["dev", "staging", "prod"] }, "string");
      expect(validate("test")).toBe("Must be one of: dev, staging, prod");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { oneOf: { value: ["a", "b"], message: "Invalid choice" } },
        "string",
      );
      expect(validate("c")).toBe("Invalid choice");
    });
  });

  describe("refine", () => {
    test("accepts value passing custom rule", () => {
      const validate = compileValidation(
        { refine: (val) => val.startsWith("@") || "Must start with @" },
        "string",
      );
      expect(validate("@user")).toBe(true);
    });

    test("rejects value failing custom rule", () => {
      const validate = compileValidation(
        { refine: (val) => val.startsWith("@") || "Must start with @" },
        "string",
      );
      expect(validate("user")).toBe("Must start with @");
    });
  });

  describe("combined rules", () => {
    test("validates multiple rules in order", () => {
      const validate = compileValidation({ email: true, minLength: 10 }, "string");

      expect(validate("test@example.com")).toBe(true);
      expect(validate("invalid")).toBe("Must be a valid email address");
      expect(validate("a@b.co")).toBe("Must be at least 10 characters");
    });

    test("stops at first error", () => {
      // Rules are checked in a fixed order: email, url, regex, minLength, maxLength, oneOf, refine
      const validate = compileValidation({ minLength: 5, email: true }, "string");
      // "ab" fails email first (checked before minLength)
      expect(validate("ab")).toBe("Must be a valid email address");
    });
  });
});

describe("Number validation", () => {
  describe("min", () => {
    test("accepts number at or above minimum", () => {
      const validate = compileValidation({ min: 0 }, "number");
      expect(validate(0)).toBe(true);
      expect(validate(100)).toBe(true);
    });

    test("rejects number below minimum", () => {
      const validate = compileValidation({ min: 0 }, "number");
      expect(validate(-1)).toBe("Must be at least 0");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { min: { value: 10, message: "Value too low" } },
        "number",
      );
      expect(validate(5)).toBe("Value too low");
    });
  });

  describe("max", () => {
    test("accepts number at or below maximum", () => {
      const validate = compileValidation({ max: 100 }, "number");
      expect(validate(100)).toBe(true);
      expect(validate(0)).toBe(true);
    });

    test("rejects number above maximum", () => {
      const validate = compileValidation({ max: 100 }, "number");
      expect(validate(101)).toBe("Must be at most 100");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { max: { value: 50, message: "Value too high" } },
        "number",
      );
      expect(validate(75)).toBe("Value too high");
    });
  });

  describe("integer", () => {
    test("accepts integers", () => {
      const validate = compileValidation({ integer: true }, "number");
      expect(validate(42)).toBe(true);
      expect(validate(-10)).toBe(true);
      expect(validate(0)).toBe(true);
    });

    test("rejects non-integers", () => {
      const validate = compileValidation({ integer: true }, "number");
      expect(validate(3.14)).toBe("Must be an integer");
      expect(validate(0.5)).toBe("Must be an integer");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { integer: { value: true, message: "Whole numbers only" } },
        "number",
      );
      expect(validate(1.5)).toBe("Whole numbers only");
    });
  });

  describe("positive", () => {
    test("accepts positive numbers", () => {
      const validate = compileValidation({ positive: true }, "number");
      expect(validate(1)).toBe(true);
      expect(validate(0.5)).toBe(true);
    });

    test("rejects zero and negative numbers", () => {
      const validate = compileValidation({ positive: true }, "number");
      expect(validate(0)).toBe("Must be positive");
      expect(validate(-1)).toBe("Must be positive");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { positive: { value: true, message: "Must be greater than 0" } },
        "number",
      );
      expect(validate(0)).toBe("Must be greater than 0");
    });
  });

  describe("negative", () => {
    test("accepts negative numbers", () => {
      const validate = compileValidation({ negative: true }, "number");
      expect(validate(-1)).toBe(true);
      expect(validate(-0.5)).toBe(true);
    });

    test("rejects zero and positive numbers", () => {
      const validate = compileValidation({ negative: true }, "number");
      expect(validate(0)).toBe("Must be negative");
      expect(validate(1)).toBe("Must be negative");
    });

    test("uses custom error message", () => {
      const validate = compileValidation(
        { negative: { value: true, message: "Must be less than 0" } },
        "number",
      );
      expect(validate(0)).toBe("Must be less than 0");
    });
  });

  describe("oneOf", () => {
    test("accepts value in list", () => {
      const validate = compileValidation({ oneOf: [1, 2, 3] }, "number");
      expect(validate(1)).toBe(true);
      expect(validate(3)).toBe(true);
    });

    test("rejects value not in list", () => {
      const validate = compileValidation({ oneOf: [1, 2, 3] }, "number");
      expect(validate(4)).toBe("Must be one of: 1, 2, 3");
    });
  });

  describe("refine", () => {
    test("accepts value passing custom rule", () => {
      const validate = compileValidation(
        { refine: (val) => val % 2 === 0 || "Must be even" },
        "number",
      );
      expect(validate(4)).toBe(true);
    });

    test("rejects value failing custom rule", () => {
      const validate = compileValidation(
        { refine: (val) => val % 2 === 0 || "Must be even" },
        "number",
      );
      expect(validate(3)).toBe("Must be even");
    });
  });

  describe("combined rules (port range)", () => {
    test("validates port range", () => {
      const validate = compileValidation({ integer: true, min: 1, max: 65535 }, "number");

      expect(validate(8080)).toBe(true);
      expect(validate(3.14)).toBe("Must be an integer");
      expect(validate(0)).toBe("Must be at least 1");
      expect(validate(70000)).toBe("Must be at most 65535");
    });
  });
});

describe("Boolean validation", () => {
  describe("refine", () => {
    test("accepts value passing custom rule", () => {
      const validate = compileValidation(
        { refine: (val) => val === true || "Must be true" },
        "boolean",
      );
      expect(validate(true)).toBe(true);
    });

    test("rejects value failing custom rule", () => {
      const validate = compileValidation(
        { refine: (val) => val === true || "Must be true" },
        "boolean",
      );
      expect(validate(false)).toBe("Must be true");
    });
  });
});

describe("Empty rules", () => {
  test("empty string rules always pass", () => {
    const validate = compileValidation({} as StringValidationRules, "string");
    expect(validate("anything")).toBe(true);
    expect(validate("")).toBe(true);
  });

  test("empty number rules always pass", () => {
    const validate = compileValidation({} as NumberValidationRules, "number");
    expect(validate(42)).toBe(true);
    expect(validate(-100)).toBe(true);
  });

  test("empty boolean rules always pass", () => {
    const validate = compileValidation({} as BooleanValidationRules, "boolean");
    expect(validate(true)).toBe(true);
    expect(validate(false)).toBe(true);
  });
});
