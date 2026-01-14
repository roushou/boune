/**
 * Runtime prompt builder - converts declarative prompt definitions to runnable prompts
 */

import type {
  InferPromptType,
  InferPrompts,
  PromptDefinition,
  RunnablePrompt,
} from "../types/prompt.ts";
import { createMultiselectSchema, createSelectSchema } from "./select.ts";
import type { CompiledValidator } from "../validation/compile.ts";
import type { Kind } from "../types/core.ts";
import { autocomplete } from "./autocomplete.ts";
import { compileValidation } from "../validation/compile.ts";
import { createConfirmSchema } from "./confirm.ts";
import { createNumberSchema } from "./number.ts";
import { createPasswordSchema } from "./password.ts";
import { createTextSchema } from "./text.ts";
import { filepath } from "./filepath.ts";
import { runPrompt } from "./core/runner.ts";

/**
 * Builder configuration for a prompt type
 */
type PromptBuilder = {
  /** Validation type for compiling validators (undefined = no validation) */
  validationType?: Kind;
  /** Build and run the prompt, returning the result */
  run: (def: PromptDefinition, validator?: CompiledValidator) => Promise<unknown>;
};

/**
 * Registry of prompt builders keyed by prompt kind
 */
const promptBuilders: Record<string, PromptBuilder> = {
  text: {
    validationType: "string",
    run: (def, validator) =>
      runPrompt(
        createTextSchema({
          message: def.message,
          default: (def as { default?: string }).default,
          placeholder: (def as { placeholder?: string }).placeholder,
          validator,
        }),
      ),
  },

  password: {
    validationType: "string",
    run: (def, validator) =>
      runPrompt(
        createPasswordSchema({
          message: def.message,
          mask: (def as { mask?: string }).mask,
          validator,
        }),
      ),
  },

  number: {
    validationType: "number",
    run: (def, validator) => {
      const d = def as {
        default?: number;
        min?: number;
        max?: number;
        integer?: boolean;
        step?: number;
      };
      return runPrompt(
        createNumberSchema({
          message: def.message,
          default: d.default,
          min: d.min,
          max: d.max,
          integer: d.integer,
          step: d.step,
          validator,
        }),
      );
    },
  },

  confirm: {
    run: (def) =>
      runPrompt(
        createConfirmSchema({
          message: def.message,
          default: (def as { default?: boolean }).default,
        }),
      ),
  },

  select: {
    run: (def) => {
      const d = def as unknown as {
        options: { label: string; value: unknown; hint?: string }[];
        default?: unknown;
      };
      return runPrompt(
        createSelectSchema({
          message: def.message,
          choices: d.options,
          default: d.default,
        }),
      );
    },
  },

  multiselect: {
    run: (def) => {
      const d = def as unknown as {
        options: { label: string; value: unknown; hint?: string }[];
        min?: number;
        max?: number;
      };
      return runPrompt(
        createMultiselectSchema({
          message: def.message,
          choices: d.options,
          min: d.min,
          max: d.max,
        }),
      );
    },
  },

  autocomplete: {
    run: (def) => {
      const d = def as unknown as {
        options: { label: string; value: unknown }[];
        limit?: number;
        allowCustom?: boolean;
        initial?: string;
      };
      return autocomplete({
        message: def.message,
        choices: d.options,
        limit: d.limit,
        allowCustom: d.allowCustom,
        initial: d.initial,
      });
    },
  },

  filepath: {
    run: (def) => {
      const d = def as {
        basePath?: string;
        extensions?: string[];
        directoryOnly?: boolean;
        fileOnly?: boolean;
        allowNew?: boolean;
        showHidden?: boolean;
        limit?: number;
      };
      return filepath({
        message: def.message,
        basePath: d.basePath,
        extensions: d.extensions,
        directoryOnly: d.directoryOnly,
        fileOnly: d.fileOnly,
        allowNew: d.allowNew,
        showHidden: d.showHidden,
        limit: d.limit,
      });
    },
  },
};

/**
 * Create a runnable prompt from a definition
 */
function createRunnablePrompt<T extends PromptDefinition>(
  definition: T,
): RunnablePrompt<InferPromptType<T>> {
  return {
    run: async (): Promise<InferPromptType<T>> => {
      const builder = promptBuilders[definition.kind];

      if (!builder) {
        throw new Error(`Unknown prompt kind: ${definition.kind}`);
      }

      // Compile validator if the builder specifies a validation type
      let validator: CompiledValidator | undefined;
      if (builder.validationType && (definition as { validator?: unknown }).validator) {
        validator = compileValidation(
          (definition as { validator: unknown }).validator as Parameters<
            typeof compileValidation
          >[0],
          builder.validationType,
        );
      }

      return builder.run(definition, validator) as Promise<InferPromptType<T>>;
    },
  };
}

/**
 * Build a record of runnable prompts from prompt definitions
 */
export function buildPrompts<T extends Record<string, PromptDefinition>>(
  defs?: T,
): InferPrompts<T> {
  if (!defs) return {} as InferPrompts<T>;

  const result: Record<string, RunnablePrompt<unknown>> = {};

  for (const [key, def] of Object.entries(defs)) {
    result[key] = createRunnablePrompt(def);
  }

  return result as InferPrompts<T>;
}
