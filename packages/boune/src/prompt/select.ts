import {
  PromptCancelledError,
  ansi,
  clearLines,
  keyPrompt,
  linePrompt,
  runPrompt,
} from "./core/index.ts";
import { color } from "../output/color.ts";

export interface SelectOption<T = string> {
  label: string;
  value: T;
  hint?: string;
}

export interface SelectOptions<T = string> {
  message: string;
  options: SelectOption<T>[];
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
    const choice = choices[i]!;
    const isSelected = i === selectedIndex;
    process.stdout.write(ansi.clearLine);
    console.log(renderOptionLine(choice, isSelected));
  }
}

/**
 * Create a select prompt schema (key-based)
 */
function createSelectSchema<T>(options: SelectOptions<T>) {
  const { message, options: choices, default: defaultValue } = options;

  // Find initial index
  const initialIndex =
    defaultValue !== undefined
      ? Math.max(
          0,
          choices.findIndex((c) => c.value === defaultValue),
        )
      : 0;

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

      if (key.name === "up" || key.name === "k") {
        const newIndex = selectedIndex > 0 ? selectedIndex - 1 : choices.length - 1;
        return { done: false, state: { ...state, selectedIndex: newIndex } };
      }

      if (key.name === "down" || key.name === "j") {
        const newIndex = selectedIndex < choices.length - 1 ? selectedIndex + 1 : 0;
        return { done: false, state: { ...state, selectedIndex: newIndex } };
      }

      if (key.name === "return") {
        // Show cursor and display selected value
        process.stdout.write(ansi.showCursor);
        clearLines(choices.length);
        console.log(color.dim("  ✓ ") + color.cyan(choices[selectedIndex]!.label));
        return { done: true, value: choices[selectedIndex]!.value };
      }

      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        process.stdout.write(ansi.showCursor);
        throw new PromptCancelledError();
      }

      // Ignore other keys
      return { done: false, state };
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
  const { message, options: choices, default: defaultValue } = options;
  const defaultIndex =
    defaultValue !== undefined ? choices.findIndex((c) => c.value === defaultValue) : -1;

  // Print header
  console.log(color.cyan("? ") + color.bold(message));

  // Print options
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i]!;
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
        return { ok: true, value: choices[defaultIndex]!.value };
      }

      const num = parseInt(raw, 10);
      if (isNaN(num) || num < 1 || num > choices.length) {
        return {
          ok: false,
          error: `Please enter a number between 1 and ${choices.length}`,
        };
      }

      return { ok: true, value: choices[num - 1]!.value };
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
    const choice = choices[i]!;
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
function createMultiselectSchema<T>(options: SelectOptions<T> & { min?: number; max?: number }) {
  const { message, options: choices, min = 0, max = choices.length } = options;

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

      if (key.name === "up" || key.name === "k") {
        const newIndex = cursorIndex > 0 ? cursorIndex - 1 : choices.length - 1;
        return { done: false, state: { ...state, cursorIndex: newIndex } };
      }

      if (key.name === "down" || key.name === "j") {
        const newIndex = cursorIndex < choices.length - 1 ? cursorIndex + 1 : 0;
        return { done: false, state: { ...state, cursorIndex: newIndex } };
      }

      if (key.name === "space") {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(cursorIndex)) {
          newSelected.delete(cursorIndex);
        } else if (newSelected.size < max) {
          newSelected.add(cursorIndex);
        }
        return { done: false, state: { ...state, selectedIndices: newSelected } };
      }

      if (key.name === "a" && !key.ctrl) {
        // Toggle all
        const newSelected = new Set<number>();
        if (selectedIndices.size === choices.length) {
          // Clear all
        } else {
          // Select all (up to max)
          for (let i = 0; i < Math.min(choices.length, max); i++) {
            newSelected.add(i);
          }
        }
        return { done: false, state: { ...state, selectedIndices: newSelected } };
      }

      if (key.name === "return") {
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
          .map((i) => choices[i]!.label)
          .join(", ");
        console.log(color.dim("  ✓ ") + color.cyan(selectedLabels || "(none)"));

        const values = Array.from(selectedIndices)
          .sort((a, b) => a - b)
          .map((i) => choices[i]!.value);
        return { done: true, value: values };
      }

      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        process.stdout.write(ansi.showCursor);
        throw new PromptCancelledError();
      }

      return { done: false, state };
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
  const { message, options: choices, min = 0, max = choices.length } = options;

  // Print header
  console.log(color.cyan("? ") + color.bold(message));

  // Print options
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i]!;
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

      return { ok: true, value: nums.map((n) => choices[n - 1]!.value) };
    },
  });

  return runPrompt(schema);
}
