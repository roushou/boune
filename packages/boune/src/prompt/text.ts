import { linePrompt, runPrompt } from "./core/index.ts";
import type { CompiledValidator } from "../validation/compile.ts";

export interface TextOptions {
  message: string;
  default?: string;
  placeholder?: string;
  /** Custom validation function (legacy) */
  validate?: (value: string) => string | true;
  /** Compiled validator function */
  validator?: CompiledValidator;
}

/**
 * Create a text prompt schema
 */
export function createTextSchema(options: TextOptions) {
  return linePrompt<string>({
    message: options.message,
    default: options.default,
    validator: options.validator,
    validate: options.validate,

    parse: (raw, _isEmpty) => {
      // Text always parses successfully (empty string is valid unless required)
      return { ok: true, value: raw };
    },
  });
}

/**
 * Prompt for text input
 */
export async function text(options: TextOptions): Promise<string> {
  const schema = createTextSchema(options);
  return runPrompt(schema);
}
