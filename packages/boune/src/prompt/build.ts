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
import { autocomplete } from "./autocomplete.ts";
import { createConfirmSchema } from "./confirm.ts";
import { createNumberSchema } from "./number.ts";
import { createPasswordSchema } from "./password.ts";
import { createTextSchema } from "./text.ts";
import { filepath } from "./filepath.ts";
import { runPrompt } from "./core/runner.ts";

/**
 * Create a runnable prompt from a definition
 */
function createRunnablePrompt<T extends PromptDefinition>(
  definition: T,
): RunnablePrompt<InferPromptType<T>> {
  return {
    run: async (): Promise<InferPromptType<T>> => {
      switch (definition.kind) {
        case "text": {
          const schema = createTextSchema({
            message: definition.message,
            default: definition.default,
            placeholder: definition.placeholder,
            validator: definition.validator,
          });
          return runPrompt(schema) as Promise<InferPromptType<T>>;
        }

        case "password": {
          const schema = createPasswordSchema({
            message: definition.message,
            mask: definition.mask,
            validator: definition.validator,
          });
          return runPrompt(schema) as Promise<InferPromptType<T>>;
        }

        case "number": {
          const schema = createNumberSchema({
            message: definition.message,
            default: definition.default,
            min: definition.min,
            max: definition.max,
            integer: definition.integer,
            step: definition.step,
            validator: definition.validator,
          });
          return runPrompt(schema) as Promise<InferPromptType<T>>;
        }

        case "confirm": {
          const schema = createConfirmSchema({
            message: definition.message,
            default: definition.default,
          });
          return runPrompt(schema) as Promise<InferPromptType<T>>;
        }

        case "select": {
          const schema = createSelectSchema({
            message: definition.message,
            options: definition.options as { label: string; value: unknown; hint?: string }[],
            default: definition.default,
          });
          return runPrompt(schema) as Promise<InferPromptType<T>>;
        }

        case "multiselect": {
          const schema = createMultiselectSchema({
            message: definition.message,
            options: definition.options as { label: string; value: unknown; hint?: string }[],
            min: definition.min,
            max: definition.max,
          });
          return runPrompt(schema) as Promise<InferPromptType<T>>;
        }

        case "autocomplete": {
          // Autocomplete doesn't use schema pattern, call directly
          return autocomplete({
            message: definition.message,
            options: definition.options as { label: string; value: unknown }[],
            limit: definition.limit,
            allowCustom: definition.allowCustom,
            initial: definition.initial,
          }) as Promise<InferPromptType<T>>;
        }

        case "filepath": {
          // Filepath doesn't use schema pattern, call directly
          return filepath({
            message: definition.message,
            basePath: definition.basePath,
            extensions: definition.extensions,
            directoryOnly: definition.directoryOnly,
            fileOnly: definition.fileOnly,
            allowNew: definition.allowNew,
            showHidden: definition.showHidden,
            limit: definition.limit,
          }) as Promise<InferPromptType<T>>;
        }

        default: {
          const exhaustiveCheck: never = definition;
          throw new Error(`Unknown prompt kind: ${(exhaustiveCheck as PromptDefinition).kind}`);
        }
      }
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
