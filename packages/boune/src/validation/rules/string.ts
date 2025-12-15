import type { RuleSpec } from "../builder.ts";

/**
 * String validation rules
 */
export const stringRules = {
  email: {
    check: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: () => "Must be a valid email address",
  },
  url: {
    check: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: () => "Must be a valid URL",
  },
  regex: {
    check: (value: string, pattern: RegExp) => pattern.test(value),
    message: (pattern: RegExp) => `Must match pattern ${pattern}`,
  },
  minLength: {
    check: (value: string, min: number) => value.length >= min,
    message: (min: number) => `Must be at least ${min} characters`,
  },
  maxLength: {
    check: (value: string, max: number) => value.length <= max,
    message: (max: number) => `Must be at most ${max} characters`,
  },
  oneOf: {
    check: <V extends string>(value: string, values: readonly V[]) => values.includes(value as V),
    message: <V extends string>(values: readonly V[]) => `Must be one of: ${values.join(", ")}`,
  },
} as const satisfies Record<string, RuleSpec<string, never[]>>;
