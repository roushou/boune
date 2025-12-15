import { linePrompt, runPrompt } from "./core/index.ts";
import type { Validator } from "../validation/types.ts";

export interface PasswordOptions {
  message: string;
  mask?: string;
  /** Custom validation function (legacy) */
  validate?: (value: string) => string | true;
  /** Validator instance */
  validator?: Validator<string>;
}

/**
 * Create a password prompt schema
 */
export function createPasswordSchema(options: PasswordOptions) {
  return linePrompt<string>({
    message: options.message,
    validator: options.validator,
    validate: options.validate,

    parse: (raw, _isEmpty) => {
      // Password always parses successfully
      return { ok: true, value: raw };
    },
  });
}

/**
 * Prompt for password/secret input
 * Note: This is a simple implementation. For true hidden input,
 * you would need to disable terminal echo which requires native bindings.
 */
export async function password(options: PasswordOptions): Promise<string> {
  const schema = createPasswordSchema(options);
  return runPrompt(schema);
}
