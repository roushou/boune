import { linePrompt, runPrompt } from "./core/index.ts";
import type { CompiledValidator } from "../validation/compile.ts";

export interface PasswordOptions {
  message: string;
  mask?: string;
  /** Custom validation function (legacy) */
  validate?: (value: string) => string | true;
  /** Compiled validator function */
  validator?: CompiledValidator;
}

/**
 * Create a password prompt schema
 */
export function createPasswordSchema(options: PasswordOptions) {
  return linePrompt<string>({
    message: options.message,
    mask: options.mask,
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
 */
export async function password(options: PasswordOptions): Promise<string> {
  const schema = createPasswordSchema(options);
  return runPrompt(schema);
}
