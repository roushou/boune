import {
  PromptCancelledError,
  ansi,
  clearLines,
  keyPrompt,
  linePrompt,
  runPrompt,
} from "./core/index.ts";
import { at } from "../utils/array.ts";
import { color } from "../output/color.ts";

export interface SelectOption<T = string> {
  label: string;
  value: T;
  hint?: string;
}

export interface SelectOptions<T = string> {
  message: string;
  choices: SelectOption<T>[];
  default?: T;
}

/**
 * State for select prompt
 */
type SelectState<T> = {
  choices: SelectOption<T>[];
  selectedIndex: number;
};

/**
 * Key type from readline
 */
type Key = {
  name: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
};

/**
 * Navigation direction type
 */
type NavigationAction = { type: "navigate"; delta: number };
type SelectAction = { type: "select" };
type CancelAction = { type: "cancel" };
type ToggleAction = { type: "toggle" };
type ToggleAllAction = { type: "toggleAll" };
type NoAction = { type: "none" };

type KeyAction =
  | NavigationAction
  | SelectAction
  | CancelAction
  | ToggleAction
  | ToggleAllAction
  | NoAction;

/**
 * Key bindings for navigation (shared between select and multiselect)
 */
const navigationBindings: Record<string, KeyAction> = {
  up: { type: "navigate", delta: -1 },
  k: { type: "navigate", delta: -1 },
  down: { type: "navigate", delta: 1 },
  j: { type: "navigate", delta: 1 },
};

/**
 * Key bindings for select prompt
 */
const selectBindings: Record<string, KeyAction> = {
  ...navigationBindings,
  return: { type: "select" },
  escape: { type: "cancel" },
};

/**
 * Key bindings for multiselect prompt
 */
const multiselectBindings: Record<string, KeyAction> = {
  ...navigationBindings,
  space: { type: "toggle" },
  a: { type: "toggleAll" },
  return: { type: "select" },
  escape: { type: "cancel" },
};

/**
 * Get action for a key press
 */
function getKeyAction(key: Key, bindings: Record<string, KeyAction>): KeyAction {
  // Check for ctrl+c cancel
  if (key.ctrl && key.name === "c") {
    return { type: "cancel" };
  }
  return bindings[key.name] ?? { type: "none" };
}

/**
 * Calculate new index after navigation (wraps around)
 */
function navigateIndex(currentIndex: number, delta: number, length: number): number {
  return (currentIndex + delta + length) % length;
}

/**
 * Handle cancel action
 */
function handleCancel(): never {
  process.stdout.write(ansi.showCursor);
  throw new PromptCancelledError();
}

/**
 * Render a single option line
 */
function renderOptionLine<T>(choice: SelectOption<T>, isSelected: boolean): string {
  const pointer = isSelected ? color.cyan("❯") : " ";
  const label = isSelected ? color.cyan(choice.label) : choice.label;
  let line = `  ${pointer} ${label}`;
  if (choice.hint) {
    line += color.dim(` - ${choice.hint}`);
  }
  return line;
}

/**
 * Render all options
 */
function renderOptions<T>(state: SelectState<T>, isInitial: boolean): void {
  const { choices, selectedIndex } = state;

  if (!isInitial) {
    process.stdout.write(ansi.moveUp(choices.length) + ansi.moveToColumn0);
  }

  for (let i = 0; i < choices.length; i++) {
    const choice = at(choices, i);
    const isSelected = i === selectedIndex;
    process.stdout.write(ansi.clearLine);
    console.log(renderOptionLine(choice, isSelected));
  }
}

/**
 * Create a select prompt schema (key-based)
 */
export function createSelectSchema<T>(options: SelectOptions<T>) {
  const { message, choices, default: defaultValue } = options;

  // Find initial index (fall back to 0 if default value not found)
  const foundIndex =
    defaultValue !== undefined ? choices.findIndex((c) => c.value === defaultValue) : -1;
  const initialIndex = foundIndex >= 0 ? foundIndex : 0;

  return keyPrompt<T>({
    message,

    initialState: (): SelectState<T> => ({
      choices,
      selectedIndex: initialIndex,
    }),

    render: (rawState, isInitial) => {
      const state = rawState as SelectState<T>;

      if (isInitial) {
        // Print header
        console.log(
          color.cyan("? ") + color.bold(message) + color.dim(" (use ↑↓ or j/k, enter to select)"),
        );
        // Hide cursor
        process.stdout.write(ansi.hideCursor);
      }

      renderOptions(state, isInitial);
    },

    handleKey: (key, rawState) => {
      const state = rawState as SelectState<T>;
      const { choices, selectedIndex } = state;
      const action = getKeyAction(key, selectBindings);

      switch (action.type) {
        case "navigate": {
          const newIndex = navigateIndex(selectedIndex, action.delta, choices.length);
          return { done: false, state: { ...state, selectedIndex: newIndex } };
        }

        case "select": {
          process.stdout.write(ansi.showCursor);
          clearLines(choices.length);
          const selected = at(choices, selectedIndex);
          console.log(color.dim("  ✓ ") + color.cyan(selected.label));
          return { done: true, value: selected.value };
        }

        case "cancel":
          handleCancel();

        default:
          return { done: false, state };
      }
    },

    cleanup: () => {
      process.stdout.write(ansi.showCursor);
    },

    fallback: async () => selectFallback(options),
  });
}

/**
 * Prompt for single selection from a list
 * Use arrow keys or j/k to navigate, enter to select
 */
export async function select<T = string>(options: SelectOptions<T>): Promise<T> {
  const schema = createSelectSchema(options);
  return runPrompt(schema);
}

/**
 * Fallback for non-TTY environments (numbered selection)
 */
async function selectFallback<T>(options: SelectOptions<T>): Promise<T> {
  const { message, choices, default: defaultValue } = options;
  const defaultIndex =
    defaultValue !== undefined ? choices.findIndex((c) => c.value === defaultValue) : -1;

  // Print header
  console.log(color.cyan("? ") + color.bold(message));

  // Print options
  for (let i = 0; i < choices.length; i++) {
    const choice = at(choices, i);
    const isDefault = i === defaultIndex;
    const prefix = isDefault ? color.cyan(`  ${i + 1}.`) : `  ${i + 1}.`;
    let line = `${prefix} ${choice.label}`;
    if (choice.hint) {
      line += color.dim(` - ${choice.hint}`);
    }
    if (isDefault) {
      line += color.dim(" (default)");
    }
    console.log(line);
  }

  const hint =
    defaultIndex >= 0 ? `1-${choices.length}, default: ${defaultIndex + 1}` : `1-${choices.length}`;

  // Use line prompt schema for fallback
  const schema = linePrompt<T>({
    message: "",
    prefix: color.dim(`  Enter choice (${hint}): `),

    parse: (raw, isEmpty) => {
      if (isEmpty && defaultIndex >= 0) {
        return { ok: true, value: at(choices, defaultIndex).value };
      }

      const num = parseInt(raw, 10);
      if (isNaN(num) || num < 1 || num > choices.length) {
        return {
          ok: false,
          error: `Please enter a number between 1 and ${choices.length}`,
        };
      }

      return { ok: true, value: at(choices, num - 1).value };
    },
  });

  return runPrompt(schema);
}

// ============================================================================
// Multiselect
// ============================================================================

/**
 * State for multiselect prompt
 */
type MultiselectState<T> = {
  choices: SelectOption<T>[];
  cursorIndex: number;
  selectedIndices: Set<number>;
  min: number;
  max: number;
};

/**
 * Render multiselect options
 */
function renderMultiselectOptions<T>(state: MultiselectState<T>, isInitial: boolean): void {
  const { choices, cursorIndex, selectedIndices } = state;

  if (!isInitial) {
    process.stdout.write(ansi.moveUp(choices.length) + ansi.moveToColumn0);
  }

  for (let i = 0; i < choices.length; i++) {
    const choice = at(choices, i);
    const isCursor = i === cursorIndex;
    const isSelected = selectedIndices.has(i);

    process.stdout.write(ansi.clearLine);

    const pointer = isCursor ? color.cyan("❯") : " ";
    const checkbox = isSelected ? color.green("◉") : color.dim("○");
    const label = isCursor ? color.cyan(choice.label) : choice.label;
    let line = `  ${pointer} ${checkbox} ${label}`;

    if (choice.hint) {
      line += color.dim(` - ${choice.hint}`);
    }

    console.log(line);
  }
}

/**
 * Create a multiselect prompt schema
 */
export function createMultiselectSchema<T>(
  options: SelectOptions<T> & { min?: number; max?: number },
) {
  const { message, choices, min = 0, max = choices.length } = options;

  return keyPrompt<T[]>({
    message,

    initialState: (): MultiselectState<T> => ({
      choices,
      cursorIndex: 0,
      selectedIndices: new Set(),
      min,
      max,
    }),

    render: (rawState, isInitial) => {
      const state = rawState as MultiselectState<T>;

      if (isInitial) {
        console.log(
          color.cyan("? ") +
            color.bold(message) +
            color.dim(" (use ↑↓ or j/k, space to toggle, enter to confirm)"),
        );
        process.stdout.write(ansi.hideCursor);
      }

      renderMultiselectOptions(state, isInitial);
    },

    handleKey: (key, rawState) => {
      const state = rawState as MultiselectState<T>;
      const { choices, cursorIndex, selectedIndices, min, max } = state;
      const action = getKeyAction(key, multiselectBindings);

      switch (action.type) {
        case "navigate": {
          const newIndex = navigateIndex(cursorIndex, action.delta, choices.length);
          return { done: false, state: { ...state, cursorIndex: newIndex } };
        }

        case "toggle": {
          const newSelected = new Set(selectedIndices);
          if (newSelected.has(cursorIndex)) {
            newSelected.delete(cursorIndex);
          } else if (newSelected.size < max) {
            newSelected.add(cursorIndex);
          }
          return { done: false, state: { ...state, selectedIndices: newSelected } };
        }

        case "toggleAll": {
          const newSelected = new Set<number>();
          if (selectedIndices.size !== choices.length) {
            // Select all (up to max)
            for (let i = 0; i < Math.min(choices.length, max); i++) {
              newSelected.add(i);
            }
          }
          // If all selected, newSelected stays empty (clear all)
          return { done: false, state: { ...state, selectedIndices: newSelected } };
        }

        case "select": {
          if (selectedIndices.size < min) {
            // Show error - re-render with error state
            clearLines(choices.length);
            console.log(color.red(`  Please select at least ${min} option(s)`));
            renderMultiselectOptions(state, true);
            return { done: false, state };
          }

          // Show cursor and display selected values
          process.stdout.write(ansi.showCursor);
          clearLines(choices.length);
          const selectedLabels = Array.from(selectedIndices)
            .sort((a, b) => a - b)
            .map((i) => at(choices, i).label)
            .join(", ");
          console.log(color.dim("  ✓ ") + color.cyan(selectedLabels || "(none)"));

          const values = Array.from(selectedIndices)
            .sort((a, b) => a - b)
            .map((i) => at(choices, i).value);
          return { done: true, value: values };
        }

        case "cancel":
          handleCancel();

        default:
          return { done: false, state };
      }
    },

    cleanup: () => {
      process.stdout.write(ansi.showCursor);
    },

    fallback: async () => multiselectFallback(options),
  });
}

/**
 * Prompt for multiple selections from a list
 * Use arrow keys or j/k to navigate, space to toggle, enter to confirm
 */
export async function multiselect<T = string>(
  options: SelectOptions<T> & { min?: number; max?: number },
): Promise<T[]> {
  const schema = createMultiselectSchema(options);
  return runPrompt(schema);
}

/**
 * Fallback for non-TTY environments (comma-separated numbers)
 */
async function multiselectFallback<T>(
  options: SelectOptions<T> & { min?: number; max?: number },
): Promise<T[]> {
  const { message, choices, min = 0, max = choices.length } = options;

  // Print header
  console.log(color.cyan("? ") + color.bold(message));

  // Print options
  for (let i = 0; i < choices.length; i++) {
    const choice = at(choices, i);
    let line = `  ${i + 1}. ${choice.label}`;
    if (choice.hint) {
      line += color.dim(` - ${choice.hint}`);
    }
    console.log(line);
  }

  const schema = linePrompt<T[]>({
    message: "",
    prefix: color.dim(`  Enter choices (comma-separated, e.g., 1,3,4): `),

    parse: (raw, isEmpty) => {
      if (isEmpty) {
        if (min > 0) {
          return { ok: false, error: `Please select at least ${min} option(s)` };
        }
        return { ok: true, value: [] };
      }

      const nums = raw.split(",").map((s) => parseInt(s.trim(), 10));
      const invalid = nums.some((n) => isNaN(n) || n < 1 || n > choices.length);

      if (invalid) {
        return {
          ok: false,
          error: `Invalid selection. Enter numbers between 1 and ${choices.length}`,
        };
      }

      if (nums.length < min) {
        return { ok: false, error: `Please select at least ${min} option(s)` };
      }

      if (nums.length > max) {
        return { ok: false, error: `Please select at most ${max} option(s)` };
      }

      return { ok: true, value: nums.map((n) => at(choices, n - 1).value) };
    },
  });

  return runPrompt(schema);
}
