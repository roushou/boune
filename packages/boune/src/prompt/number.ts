import { linePrompt, runPrompt } from "./core/index.ts";
import type { Validator } from "../validation/types.ts";

export interface NumberOptions {
  message: string;
  default?: number;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Only allow integers */
  integer?: boolean;
  /** Step increment (for display hint) */
  step?: number;
  /** Custom validation function (legacy) */
  validate?: (value: number) => string | true;
  /** Validator instance */
  validator?: Validator<number>;
}

/**
 * Build constraint hint string
 */
export function buildHint(options: NumberOptions): string {
  const parts: string[] = [];

  if (options.min !== undefined && options.max !== undefined) {
    parts.push(`${options.min}-${options.max}`);
  } else if (options.min !== undefined) {
    parts.push(`≥${options.min}`);
  } else if (options.max !== undefined) {
    parts.push(`≤${options.max}`);
  }

  if (options.integer) {
    parts.push("integer");
  }

  return parts.length > 0 ? parts.join(", ") : "";
}

/**
 * Validate number against constraints
 */
export function validateConstraints(value: number, options: NumberOptions): string | true {
  if (options.integer && !Number.isInteger(value)) {
    return "Please enter an integer";
  }

  if (options.min !== undefined && value < options.min) {
    return `Value must be at least ${options.min}`;
  }

  if (options.max !== undefined && value > options.max) {
    return `Value must be at most ${options.max}`;
  }

  return true;
}

/**
 * Create a number prompt schema
 */
export function createNumberSchema(options: NumberOptions) {
  return linePrompt<number>({
    message: options.message,
    default: options.default,
    validator: options.validator,
    validate: options.validate,

    hint: () => {
      const hint = buildHint(options);
      return hint || undefined;
    },

    parse: (raw, isEmpty) => {
      if (isEmpty && options.default !== undefined) {
        return { ok: true, value: options.default };
      }

      const value = Number(raw);

      if (Number.isNaN(value)) {
        return { ok: false, error: "Please enter a valid number" };
      }

      // Validate built-in constraints
      const constraintResult = validateConstraints(value, options);
      if (constraintResult !== true) {
        return { ok: false, error: constraintResult };
      }

      return { ok: true, value };
    },
  });
}

/**
 * Prompt for number input
 *
 * @example
 * ```typescript
 * const port = await number({
 *   message: "Port number:",
 *   default: 3000,
 *   min: 1,
 *   max: 65535,
 *   integer: true,
 * });
 * ```
 */
export async function number(options: NumberOptions): Promise<number> {
  const schema = createNumberSchema(options);
  return runPrompt(schema);
}
