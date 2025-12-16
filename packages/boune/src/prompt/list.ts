import { linePrompt, runPrompt } from "./core/index.ts";
import type { CompiledValidator } from "../validation/compile.ts";

export interface ListOptions {
  message: string;
  /** Default values */
  default?: string[];
  /** Separator for parsing (default: ",") */
  separator?: string;
  /** Whether to trim whitespace from each item (default: true) */
  trim?: boolean;
  /** Whether to filter out empty items (default: true) */
  filterEmpty?: boolean;
  /** Minimum number of items required */
  min?: number;
  /** Maximum number of items allowed */
  max?: number;
  /** Custom validation function for individual items */
  validateItem?: (item: string, index: number) => string | true;
  /** Custom validation function for the entire list */
  validate?: (value: string[]) => string | true;
  /** Compiled validator function */
  validator?: CompiledValidator;
}

/**
 * Create a list prompt schema
 */
export function createListSchema(options: ListOptions) {
  const {
    message,
    default: defaultValue,
    separator = ",",
    trim = true,
    filterEmpty = true,
    min,
    max,
    validateItem,
    validate,
    validator,
  } = options;

  return linePrompt<string[]>({
    message,
    default: defaultValue,
    validator,
    validate,

    hint: () => {
      const parts: string[] = [];
      if (separator !== ",") {
        parts.push(`separated by "${separator}"`);
      } else {
        parts.push("comma-separated");
      }
      if (min !== undefined && max !== undefined) {
        parts.push(`${min}-${max} items`);
      } else if (min !== undefined) {
        parts.push(`min ${min}`);
      } else if (max !== undefined) {
        parts.push(`max ${max}`);
      }
      return parts.join(", ");
    },

    parse: (raw, isEmpty) => {
      // Handle empty input
      if (isEmpty) {
        if (defaultValue !== undefined) {
          return { ok: true, value: defaultValue };
        }
        if (min !== undefined && min > 0) {
          return { ok: false, error: `Please enter at least ${min} item(s)` };
        }
        return { ok: true, value: [] };
      }

      // Split by separator
      let items = raw.split(separator);

      // Trim whitespace
      if (trim) {
        items = items.map((item) => item.trim());
      }

      // Filter empty items
      if (filterEmpty) {
        items = items.filter((item) => item !== "");
      }

      // Check min/max constraints
      if (min !== undefined && items.length < min) {
        return { ok: false, error: `Please enter at least ${min} item(s)` };
      }
      if (max !== undefined && items.length > max) {
        return { ok: false, error: `Please enter at most ${max} item(s)` };
      }

      // Validate individual items
      if (validateItem) {
        for (let i = 0; i < items.length; i++) {
          const result = validateItem(items[i]!, i);
          if (result !== true) {
            return { ok: false, error: result };
          }
        }
      }

      return { ok: true, value: items };
    },
  });
}

/**
 * Prompt for a list of values entered as a delimited string
 *
 * Parses comma-separated (or custom separator) input into an array.
 * Useful for entering multiple values like tags, emails, or filenames.
 *
 * @example
 * ```typescript
 * // Basic comma-separated list
 * const tags = await list({
 *   message: "Enter tags:",
 * });
 * // User enters: "react, typescript, bun"
 * // Returns: ["react", "typescript", "bun"]
 *
 * // With constraints
 * const emails = await list({
 *   message: "Enter email addresses:",
 *   min: 1,
 *   max: 5,
 *   validateItem: (email) => {
 *     return email.includes("@") ? true : `"${email}" is not a valid email`;
 *   },
 * });
 *
 * // Custom separator
 * const paths = await list({
 *   message: "Enter paths:",
 *   separator: ":",
 * });
 * ```
 */
export async function list(options: ListOptions): Promise<string[]> {
  const schema = createListSchema(options);
  return runPrompt(schema);
}
