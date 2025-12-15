import { linePrompt, runPrompt } from "./core/index.ts";

export interface ConfirmOptions {
  message: string;
  default?: boolean;
}

/**
 * Create a confirm prompt schema
 */
export function createConfirmSchema(options: ConfirmOptions) {
  const defaultValue = options.default ?? false;

  return linePrompt<boolean>({
    message: options.message,
    default: defaultValue,

    hint: () => (defaultValue ? "Y/n" : "y/N"),

    parse: (raw, isEmpty) => {
      if (isEmpty) {
        return { ok: true, value: defaultValue };
      }

      const lower = raw.toLowerCase();

      if (lower === "y" || lower === "yes") {
        return { ok: true, value: true };
      }

      if (lower === "n" || lower === "no") {
        return { ok: true, value: false };
      }

      return { ok: false, error: "Please enter y or n" };
    },
  });
}

/**
 * Prompt for yes/no confirmation
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const schema = createConfirmSchema(options);
  return runPrompt(schema);
}
