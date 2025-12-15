import type { RuleSpec } from "../builder.ts";

/**
 * Number validation rules
 */
export const numberRules = {
  min: {
    check: (value: number, min: number) => value >= min,
    message: (min: number) => `Must be at least ${min}`,
  },
  max: {
    check: (value: number, max: number) => value <= max,
    message: (max: number) => `Must be at most ${max}`,
  },
  integer: {
    check: (value: number) => Number.isInteger(value),
    message: () => "Must be an integer",
  },
  positive: {
    check: (value: number) => value > 0,
    message: () => "Must be positive",
  },
  negative: {
    check: (value: number) => value < 0,
    message: () => "Must be negative",
  },
  oneOf: {
    check: <V extends number>(value: number, values: readonly V[]) => values.includes(value as V),
    message: <V extends number>(values: readonly V[]) => `Must be one of: ${values.join(", ")}`,
  },
} as const satisfies Record<string, RuleSpec<number, never[]>>;
