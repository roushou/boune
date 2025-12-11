import type { Validator } from "../validation/types.ts";
import { color } from "../output/color.ts";
import { readLine } from "./stdin.ts";

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
  const { message, default: defaultValue, validate, validator } = options;

  // Build prompt string
  let prompt = color.cyan("? ") + color.bold(message);

  const hint = buildHint(options);
  if (hint) {
    prompt += color.dim(` [${hint}]`);
  }

  if (defaultValue !== undefined) {
    prompt += color.dim(` (${defaultValue})`);
  }
  prompt += " ";

  process.stdout.write(prompt);

  const input = await readLine();
  const trimmed = input.trim();

  // Apply default if empty
  if (trimmed === "" && defaultValue !== undefined) {
    return defaultValue;
  }

  // Parse number
  const value = Number(trimmed);

  if (Number.isNaN(value)) {
    console.log(color.red("  Please enter a valid number"));
    return number(options);
  }

  // Validate constraints
  const constraintResult = validateConstraints(value, options);
  if (constraintResult !== true) {
    console.log(color.red(`  ${constraintResult}`));
    return number(options);
  }

  // Validate with validator instance
  if (validator) {
    const validation = validator.validate(value);
    if (validation !== true) {
      console.log(color.red(`  ${validation}`));
      return number(options);
    }
  }

  // Validate with function (legacy)
  if (validate) {
    const validation = validate(value);
    if (validation !== true) {
      console.log(color.red(`  ${validation}`));
      return number(options);
    }
  }

  return value;
}
