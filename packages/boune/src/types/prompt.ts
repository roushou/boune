/**
 * Declarative prompt type definitions
 */

import type { AutocompleteOption, SelectOption } from "../prompt/index.ts";
import type { Validator } from "../validation/types.ts";

/**
 * Base fields shared by all prompt definitions
 */
type BasePromptDef = {
  message: string;
};

/**
 * Text prompt definition
 */
export type TextPromptDef = BasePromptDef & {
  kind: "text";
  default?: string;
  placeholder?: string;
  validator?: Validator<string>;
};

/**
 * Password prompt definition
 */
export type PasswordPromptDef = BasePromptDef & {
  kind: "password";
  mask?: string;
  validator?: Validator<string>;
};

/**
 * Number prompt definition
 */
export type NumberPromptDef = BasePromptDef & {
  kind: "number";
  default?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  step?: number;
  validator?: Validator<number>;
};

/**
 * Confirm prompt definition
 */
export type ConfirmPromptDef = BasePromptDef & {
  kind: "confirm";
  default?: boolean;
};

/**
 * Select prompt definition
 */
export type SelectPromptDef<T = string> = BasePromptDef & {
  kind: "select";
  options: readonly SelectOption<T>[];
  default?: T;
};

/**
 * Multiselect prompt definition
 */
export type MultiselectPromptDef<T = string> = BasePromptDef & {
  kind: "multiselect";
  options: readonly SelectOption<T>[];
  min?: number;
  max?: number;
};

/**
 * Autocomplete prompt definition
 */
export type AutocompletePromptDef<T = string> = BasePromptDef & {
  kind: "autocomplete";
  options: readonly AutocompleteOption<T>[];
  limit?: number;
  allowCustom?: boolean;
  initial?: string;
};

/**
 * Filepath prompt definition
 */
export type FilepathPromptDef = BasePromptDef & {
  kind: "filepath";
  basePath?: string;
  extensions?: string[];
  directoryOnly?: boolean;
  fileOnly?: boolean;
  allowNew?: boolean;
  showHidden?: boolean;
  limit?: number;
};

/**
 * Discriminated union of all prompt definitions
 */
export type PromptDefinition =
  | TextPromptDef
  | PasswordPromptDef
  | NumberPromptDef
  | ConfirmPromptDef
  | SelectPromptDef<unknown>
  | MultiselectPromptDef<unknown>
  | AutocompletePromptDef<unknown>
  | FilepathPromptDef;

/**
 * Infer the return type of a prompt based on its definition
 */
export type InferPromptType<T> = T extends { kind: "text" }
  ? string
  : T extends { kind: "password" }
    ? string
    : T extends { kind: "number" }
      ? number
      : T extends { kind: "confirm" }
        ? boolean
        : T extends { kind: "select"; options: readonly SelectOption<infer V>[] }
          ? V
          : T extends { kind: "multiselect"; options: readonly SelectOption<infer V>[] }
            ? V[]
            : T extends { kind: "autocomplete"; options: readonly AutocompleteOption<infer V>[] }
              ? V | string
              : T extends { kind: "filepath" }
                ? string
                : never;

/**
 * A prompt that can be executed with .run()
 */
export type RunnablePrompt<T> = {
  run(): Promise<T>;
};

/**
 * Infer the prompts record type from prompt definitions
 */
export type InferPrompts<T extends Record<string, PromptDefinition>> = {
  [K in keyof T]: RunnablePrompt<InferPromptType<T[K]>>;
};
