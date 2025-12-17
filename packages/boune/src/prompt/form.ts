import { PromptCancelledError, ansi, keyPrompt, runPrompt } from "./core/index.ts";
import { color } from "../output/color.ts";

export interface FormField {
  /** Field name (used as key in result object) */
  name: string;
  /** Display label */
  label: string;
  /** Field type */
  type?: "text" | "password" | "number";
  /** Whether the field is required */
  required?: boolean;
  /** Default value */
  default?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Validation function */
  validate?: (value: string) => string | true;
}

export interface FormOptions {
  message: string;
  /** Form fields to collect */
  fields: FormField[];
}

export type FormResult<T extends FormField[]> = {
  [K in T[number]["name"]]: string;
};

/**
 * State for form prompt
 */
type FormState = {
  fields: FormField[];
  values: Map<string, string>;
  activeIndex: number;
  cursorPos: number;
  errors: Map<string, string>;
  submitted: boolean;
};

/**
 * Render a single field
 */
function renderField(
  field: FormField,
  value: string,
  isActive: boolean,
  error: string | undefined,
  cursorPos: number,
): string {
  const prefix = isActive ? color.cyan("❯") : " ";
  const label = isActive ? color.cyan(field.label) : field.label;
  const required = field.required ? color.red("*") : "";

  let displayValue: string;
  if (field.type === "password" && value) {
    displayValue = "•".repeat(value.length);
  } else if (value) {
    displayValue = value;
  } else if (field.placeholder && !isActive) {
    displayValue = color.dim(field.placeholder);
  } else {
    displayValue = "";
  }

  // Show cursor in active field
  if (isActive) {
    const before = displayValue.slice(0, cursorPos);
    const cursorChar = displayValue[cursorPos] || " ";
    const after = displayValue.slice(cursorPos + 1);
    displayValue = before + color.underline(cursorChar) + after;
  }

  let line = `  ${prefix} ${label}${required}: ${displayValue}`;

  if (error) {
    line += " " + color.red(`← ${error}`);
  }

  return line;
}

/**
 * Render the entire form
 */
function renderForm(state: FormState, isInitial: boolean): void {
  const { fields, values, activeIndex, cursorPos, errors } = state;

  if (!isInitial) {
    // Move up to overwrite previous render
    process.stdout.write(ansi.moveUp(fields.length + 1) + ansi.moveToColumn0);
  }

  // Hint line
  process.stdout.write(ansi.clearLine);
  console.log(color.dim("  (↑↓/tab to navigate, enter to submit)"));

  // Render each field
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    const value = values.get(field.name) ?? field.default ?? "";
    const isActive = i === activeIndex;
    const error = errors.get(field.name);

    process.stdout.write(ansi.clearLine);
    console.log(renderField(field, value, isActive, error, isActive ? cursorPos : 0));
  }
}

/**
 * Validate all fields
 */
function validateForm(state: FormState): Map<string, string> {
  const errors = new Map<string, string>();
  const { fields, values } = state;

  for (const field of fields) {
    const value = values.get(field.name) ?? field.default ?? "";

    // Check required
    if (field.required && !value.trim()) {
      errors.set(field.name, "Required");
      continue;
    }

    // Check number type
    if (field.type === "number" && value.trim()) {
      if (isNaN(Number(value))) {
        errors.set(field.name, "Must be a number");
        continue;
      }
    }

    // Custom validation
    if (field.validate && value.trim()) {
      const result = field.validate(value);
      if (result !== true) {
        errors.set(field.name, result);
      }
    }
  }

  return errors;
}

/**
 * Create a form prompt schema
 */
export function createFormSchema(options: FormOptions) {
  const { message, fields } = options;

  return keyPrompt<Record<string, string>>({
    message,

    initialState: (): FormState => {
      const values = new Map<string, string>();
      // Initialize with defaults
      for (const field of fields) {
        if (field.default) {
          values.set(field.name, field.default);
        }
      }
      return {
        fields,
        values,
        activeIndex: 0,
        cursorPos: values.get(fields[0]?.name ?? "")?.length ?? 0,
        errors: new Map(),
        submitted: false,
      };
    },

    render: (rawState, isInitial) => {
      const state = rawState as FormState;

      if (isInitial) {
        console.log(color.cyan("? ") + color.bold(message));
        process.stdout.write(ansi.hideCursor);
      }

      renderForm(state, isInitial);
    },

    handleKey: (key, rawState) => {
      const state = rawState as FormState;
      const { fields, values, activeIndex, cursorPos } = state;
      const currentField = fields[activeIndex]!;
      const currentValue = values.get(currentField.name) ?? currentField.default ?? "";

      // Navigation
      if (key.name === "up" || (key.name === "tab" && key.ctrl)) {
        const newIndex = activeIndex > 0 ? activeIndex - 1 : fields.length - 1;
        const newField = fields[newIndex]!;
        const newValue = values.get(newField.name) ?? newField.default ?? "";
        return {
          done: false,
          state: { ...state, activeIndex: newIndex, cursorPos: newValue.length, errors: new Map() },
        };
      }

      if (key.name === "down" || key.name === "tab") {
        const newIndex = activeIndex < fields.length - 1 ? activeIndex + 1 : 0;
        const newField = fields[newIndex]!;
        const newValue = values.get(newField.name) ?? newField.default ?? "";
        return {
          done: false,
          state: { ...state, activeIndex: newIndex, cursorPos: newValue.length, errors: new Map() },
        };
      }

      // Cursor movement within field
      if (key.name === "left") {
        return {
          done: false,
          state: { ...state, cursorPos: Math.max(0, cursorPos - 1) },
        };
      }

      if (key.name === "right") {
        return {
          done: false,
          state: { ...state, cursorPos: Math.min(currentValue.length, cursorPos + 1) },
        };
      }

      // Home/End
      if (key.name === "home" || (key.ctrl && key.name === "a")) {
        return { done: false, state: { ...state, cursorPos: 0 } };
      }

      if (key.name === "end" || (key.ctrl && key.name === "e")) {
        return { done: false, state: { ...state, cursorPos: currentValue.length } };
      }

      // Backspace
      if (key.name === "backspace") {
        if (cursorPos > 0) {
          const newValue = currentValue.slice(0, cursorPos - 1) + currentValue.slice(cursorPos);
          const newValues = new Map(values);
          newValues.set(currentField.name, newValue);
          return {
            done: false,
            state: { ...state, values: newValues, cursorPos: cursorPos - 1, errors: new Map() },
          };
        }
        return { done: false, state };
      }

      // Delete
      if (key.name === "delete") {
        if (cursorPos < currentValue.length) {
          const newValue = currentValue.slice(0, cursorPos) + currentValue.slice(cursorPos + 1);
          const newValues = new Map(values);
          newValues.set(currentField.name, newValue);
          return {
            done: false,
            state: { ...state, values: newValues, errors: new Map() },
          };
        }
        return { done: false, state };
      }

      // Submit
      if (key.name === "return") {
        const validationErrors = validateForm(state);

        if (validationErrors.size > 0) {
          // Show errors and focus first error field
          const firstErrorField = fields.findIndex((f) => validationErrors.has(f.name));
          return {
            done: false,
            state: {
              ...state,
              errors: validationErrors,
              activeIndex: firstErrorField >= 0 ? firstErrorField : activeIndex,
            },
          };
        }

        // Success - build result object
        process.stdout.write(ansi.showCursor);

        // Clear form and show summary
        process.stdout.write(ansi.moveUp(fields.length + 1) + ansi.moveToColumn0);
        for (let i = 0; i <= fields.length; i++) {
          process.stdout.write(ansi.clearLine + "\n");
        }
        process.stdout.write(ansi.moveUp(fields.length + 1) + ansi.moveToColumn0);

        // Show completed values
        for (const field of fields) {
          const value = values.get(field.name) ?? field.default ?? "";
          const displayValue = field.type === "password" ? "•".repeat(value.length) : value;
          console.log(
            color.dim("  ✓ ") + field.label + ": " + color.cyan(displayValue || "(empty)"),
          );
        }

        const result: Record<string, string> = {};
        for (const field of fields) {
          result[field.name] = values.get(field.name) ?? field.default ?? "";
        }

        return { done: true, value: result };
      }

      // Cancel
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        process.stdout.write(ansi.showCursor);
        throw new PromptCancelledError();
      }

      // Character input
      if (key.name && key.name.length === 1 && !key.ctrl) {
        const newValue =
          currentValue.slice(0, cursorPos) + key.name + currentValue.slice(cursorPos);
        const newValues = new Map(values);
        newValues.set(currentField.name, newValue);
        return {
          done: false,
          state: { ...state, values: newValues, cursorPos: cursorPos + 1, errors: new Map() },
        };
      }

      // Space
      if (key.name === "space") {
        const newValue = currentValue.slice(0, cursorPos) + " " + currentValue.slice(cursorPos);
        const newValues = new Map(values);
        newValues.set(currentField.name, newValue);
        return {
          done: false,
          state: { ...state, values: newValues, cursorPos: cursorPos + 1, errors: new Map() },
        };
      }

      return { done: false, state };
    },

    cleanup: () => {
      process.stdout.write(ansi.showCursor);
    },
  });
}

/**
 * Prompt for multiple values in a form layout
 *
 * Collects multiple fields at once in an interactive form.
 * Navigate with Tab/Arrow keys, submit with Enter.
 *
 * @example
 * ```typescript
 * const user = await form({
 *   message: "Create account:",
 *   fields: [
 *     { name: "username", label: "Username", required: true },
 *     { name: "email", label: "Email", required: true, validate: (v) =>
 *       v.includes("@") ? true : "Invalid email"
 *     },
 *     { name: "password", label: "Password", type: "password", required: true },
 *   ],
 * });
 * // Returns: { username: "john", email: "john@example.com", password: "secret" }
 * ```
 */
export async function form<T extends FormField[]>(
  options: FormOptions & { fields: T },
): Promise<FormResult<T>> {
  const schema = createFormSchema(options);
  return runPrompt(schema) as Promise<FormResult<T>>;
}
