import { describe, expect, test } from "bun:test";
import { v } from "../src/validation/index.ts";

describe("v.string()", () => {
  test("creates a string validator", () => {
    const validator = v.string();
    expect(validator).toBeDefined();
    expect(validator.validate("hello")).toBe(true);
  });

  describe("email()", () => {
    test("accepts valid email", () => {
      const validator = v.string().email();
      expect(validator.validate("test@example.com")).toBe(true);
      expect(validator.validate("user.name@domain.co.uk")).toBe(true);
    });

    test("rejects invalid email", () => {
      const validator = v.string().email();
      expect(validator.validate("invalid")).toBe("Must be a valid email address");
      expect(validator.validate("@example.com")).toBe("Must be a valid email address");
      expect(validator.validate("test@")).toBe("Must be a valid email address");
    });

    test("uses custom error message", () => {
      const validator = v.string().email("Please enter a valid email");
      expect(validator.validate("invalid")).toBe("Please enter a valid email");
    });
  });

  describe("url()", () => {
    test("accepts valid URL", () => {
      const validator = v.string().url();
      expect(validator.validate("https://example.com")).toBe(true);
      expect(validator.validate("http://localhost:3000")).toBe(true);
      expect(validator.validate("ftp://files.example.com/path")).toBe(true);
    });

    test("rejects invalid URL", () => {
      const validator = v.string().url();
      expect(validator.validate("not-a-url")).toBe("Must be a valid URL");
      expect(validator.validate("example.com")).toBe("Must be a valid URL");
    });

    test("uses custom error message", () => {
      const validator = v.string().url("Invalid URL format");
      expect(validator.validate("invalid")).toBe("Invalid URL format");
    });
  });

  describe("regex()", () => {
    test("accepts matching pattern", () => {
      const validator = v.string().regex(/^[a-z]+$/);
      expect(validator.validate("hello")).toBe(true);
      expect(validator.validate("world")).toBe(true);
    });

    test("rejects non-matching pattern", () => {
      const validator = v.string().regex(/^[a-z]+$/);
      expect(validator.validate("Hello")).toContain("Must match pattern");
      expect(validator.validate("123")).toContain("Must match pattern");
    });

    test("uses custom error message", () => {
      const validator = v.string().regex(/^[a-z]+$/, "Only lowercase letters allowed");
      expect(validator.validate("ABC")).toBe("Only lowercase letters allowed");
    });
  });

  describe("minLength()", () => {
    test("accepts string at or above minimum", () => {
      const validator = v.string().minLength(3);
      expect(validator.validate("abc")).toBe(true);
      expect(validator.validate("abcd")).toBe(true);
    });

    test("rejects string below minimum", () => {
      const validator = v.string().minLength(3);
      expect(validator.validate("ab")).toBe("Must be at least 3 characters");
      expect(validator.validate("")).toBe("Must be at least 3 characters");
    });

    test("uses custom error message", () => {
      const validator = v.string().minLength(5, "Too short!");
      expect(validator.validate("hi")).toBe("Too short!");
    });
  });

  describe("maxLength()", () => {
    test("accepts string at or below maximum", () => {
      const validator = v.string().maxLength(5);
      expect(validator.validate("hello")).toBe(true);
      expect(validator.validate("hi")).toBe(true);
    });

    test("rejects string above maximum", () => {
      const validator = v.string().maxLength(5);
      expect(validator.validate("hello!")).toBe("Must be at most 5 characters");
    });

    test("uses custom error message", () => {
      const validator = v.string().maxLength(3, "Too long!");
      expect(validator.validate("hello")).toBe("Too long!");
    });
  });

  describe("oneOf()", () => {
    test("accepts value in list", () => {
      const validator = v.string().oneOf(["dev", "staging", "prod"]);
      expect(validator.validate("dev")).toBe(true);
      expect(validator.validate("prod")).toBe(true);
    });

    test("rejects value not in list", () => {
      const validator = v.string().oneOf(["dev", "staging", "prod"]);
      expect(validator.validate("test")).toBe("Must be one of: dev, staging, prod");
    });

    test("uses custom error message", () => {
      const validator = v.string().oneOf(["a", "b"], "Invalid choice");
      expect(validator.validate("c")).toBe("Invalid choice");
    });
  });

  describe("refine()", () => {
    test("accepts value passing custom rule", () => {
      const validator = v.string().refine((val) => val.startsWith("@") || "Must start with @");
      expect(validator.validate("@user")).toBe(true);
    });

    test("rejects value failing custom rule", () => {
      const validator = v.string().refine((val) => val.startsWith("@") || "Must start with @");
      expect(validator.validate("user")).toBe("Must start with @");
    });

    test("custom message overrides rule message", () => {
      const validator = v.string().refine((val) => val.length > 0 || "Rule error", "Custom error");
      expect(validator.validate("")).toBe("Custom error");
    });
  });

  describe("chaining", () => {
    test("combines multiple validators", () => {
      const validator = v
        .string()
        .minLength(3)
        .maxLength(10)
        .regex(/^[a-z]+$/);

      expect(validator.validate("hello")).toBe(true);
      expect(validator.validate("hi")).toBe("Must be at least 3 characters");
      expect(validator.validate("hellohellohello")).toBe("Must be at most 10 characters");
      expect(validator.validate("Hello")).toContain("Must match pattern");
    });

    test("stops at first error", () => {
      const validator = v.string().minLength(5).email();
      expect(validator.validate("ab")).toBe("Must be at least 5 characters");
    });
  });
});

describe("v.number()", () => {
  test("creates a number validator", () => {
    const validator = v.number();
    expect(validator).toBeDefined();
    expect(validator.validate(42)).toBe(true);
  });

  describe("min()", () => {
    test("accepts number at or above minimum", () => {
      const validator = v.number().min(0);
      expect(validator.validate(0)).toBe(true);
      expect(validator.validate(100)).toBe(true);
    });

    test("rejects number below minimum", () => {
      const validator = v.number().min(0);
      expect(validator.validate(-1)).toBe("Must be at least 0");
    });

    test("uses custom error message", () => {
      const validator = v.number().min(10, "Value too low");
      expect(validator.validate(5)).toBe("Value too low");
    });
  });

  describe("max()", () => {
    test("accepts number at or below maximum", () => {
      const validator = v.number().max(100);
      expect(validator.validate(100)).toBe(true);
      expect(validator.validate(0)).toBe(true);
    });

    test("rejects number above maximum", () => {
      const validator = v.number().max(100);
      expect(validator.validate(101)).toBe("Must be at most 100");
    });

    test("uses custom error message", () => {
      const validator = v.number().max(50, "Value too high");
      expect(validator.validate(75)).toBe("Value too high");
    });
  });

  describe("integer()", () => {
    test("accepts integers", () => {
      const validator = v.number().integer();
      expect(validator.validate(42)).toBe(true);
      expect(validator.validate(-10)).toBe(true);
      expect(validator.validate(0)).toBe(true);
    });

    test("rejects non-integers", () => {
      const validator = v.number().integer();
      expect(validator.validate(3.14)).toBe("Must be an integer");
      expect(validator.validate(0.5)).toBe("Must be an integer");
    });

    test("uses custom error message", () => {
      const validator = v.number().integer("Whole numbers only");
      expect(validator.validate(1.5)).toBe("Whole numbers only");
    });
  });

  describe("positive()", () => {
    test("accepts positive numbers", () => {
      const validator = v.number().positive();
      expect(validator.validate(1)).toBe(true);
      expect(validator.validate(0.5)).toBe(true);
    });

    test("rejects zero and negative numbers", () => {
      const validator = v.number().positive();
      expect(validator.validate(0)).toBe("Must be positive");
      expect(validator.validate(-1)).toBe("Must be positive");
    });

    test("uses custom error message", () => {
      const validator = v.number().positive("Must be greater than 0");
      expect(validator.validate(0)).toBe("Must be greater than 0");
    });
  });

  describe("negative()", () => {
    test("accepts negative numbers", () => {
      const validator = v.number().negative();
      expect(validator.validate(-1)).toBe(true);
      expect(validator.validate(-0.5)).toBe(true);
    });

    test("rejects zero and positive numbers", () => {
      const validator = v.number().negative();
      expect(validator.validate(0)).toBe("Must be negative");
      expect(validator.validate(1)).toBe("Must be negative");
    });

    test("uses custom error message", () => {
      const validator = v.number().negative("Must be less than 0");
      expect(validator.validate(0)).toBe("Must be less than 0");
    });
  });

  describe("oneOf()", () => {
    test("accepts value in list", () => {
      const validator = v.number().oneOf([1, 2, 3]);
      expect(validator.validate(1)).toBe(true);
      expect(validator.validate(3)).toBe(true);
    });

    test("rejects value not in list", () => {
      const validator = v.number().oneOf([1, 2, 3]);
      expect(validator.validate(4)).toBe("Must be one of: 1, 2, 3");
    });
  });

  describe("refine()", () => {
    test("accepts value passing custom rule", () => {
      const validator = v.number().refine((val) => val % 2 === 0 || "Must be even");
      expect(validator.validate(4)).toBe(true);
    });

    test("rejects value failing custom rule", () => {
      const validator = v.number().refine((val) => val % 2 === 0 || "Must be even");
      expect(validator.validate(3)).toBe("Must be even");
    });
  });

  describe("chaining", () => {
    test("combines multiple validators (port range)", () => {
      const validator = v.number().integer().min(1).max(65535);

      expect(validator.validate(8080)).toBe(true);
      expect(validator.validate(3.14)).toBe("Must be an integer");
      expect(validator.validate(0)).toBe("Must be at least 1");
      expect(validator.validate(70000)).toBe("Must be at most 65535");
    });
  });
});

describe("v.boolean()", () => {
  test("creates a boolean validator", () => {
    const validator = v.boolean();
    expect(validator).toBeDefined();
    expect(validator.validate(true)).toBe(true);
    expect(validator.validate(false)).toBe(true);
  });

  describe("refine()", () => {
    test("accepts value passing custom rule", () => {
      const validator = v.boolean().refine((val) => val === true || "Must be true");
      expect(validator.validate(true)).toBe(true);
    });

    test("rejects value failing custom rule", () => {
      const validator = v.boolean().refine((val) => val === true || "Must be true");
      expect(validator.validate(false)).toBe("Must be true");
    });
  });
});

describe("v.custom()", () => {
  test("creates a custom validator", () => {
    const validator = v.custom<string>((val) => (val.length > 0 ? true : "Required"));
    expect(validator.validate("hello")).toBe(true);
    expect(validator.validate("")).toBe("Required");
  });
});

describe("immutability", () => {
  test("chaining creates new validator instances", () => {
    const base = v.string();
    const withMin = base.minLength(3);
    const withMax = base.maxLength(10);

    // Original validator should not be modified
    expect(base.validate("hi")).toBe(true);
    expect(withMin.validate("hi")).toBe("Must be at least 3 characters");
    expect(withMax.validate("hi")).toBe(true);
  });

  test("rules are immutable", () => {
    const validator = v.string().minLength(3);
    const rules = validator.getRules();

    expect(rules).toHaveLength(1);
    expect(() => {
      (rules as unknown[]).push(() => true);
    }).toThrow();
  });
});
