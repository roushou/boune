import { PromptCancelledError, ansi, keyPrompt, linePrompt, runPrompt } from "./core/index.ts";
import { color } from "../output/color.ts";

export interface ToggleOptions {
  message: string;
  /** Default value (default: false) */
  default?: boolean;
  /** Label for the "on" state (default: "Yes") */
  active?: string;
  /** Label for the "off" state (default: "No") */
  inactive?: string;
}

/**
 * State for toggle prompt
 */
type ToggleState = {
  value: boolean;
  activeLabel: string;
  inactiveLabel: string;
};

/**
 * Render the toggle display
 */
function renderToggle(state: ToggleState): string {
  const { value, activeLabel, inactiveLabel } = state;

  if (value) {
    // On state: show active highlighted
    return `${color.dim(inactiveLabel)} / ${color.cyan(color.bold(activeLabel))}`;
  } else {
    // Off state: show inactive highlighted
    return `${color.cyan(color.bold(inactiveLabel))} / ${color.dim(activeLabel)}`;
  }
}

/**
 * Create a toggle prompt schema (key-based)
 */
export function createToggleSchema(options: ToggleOptions) {
  const { message, default: defaultValue = false, active = "Yes", inactive = "No" } = options;

  return keyPrompt<boolean>({
    message,
    default: defaultValue,

    initialState: (): ToggleState => ({
      value: defaultValue,
      activeLabel: active,
      inactiveLabel: inactive,
    }),

    render: (rawState, isInitial) => {
      const state = rawState as ToggleState;

      if (isInitial) {
        // Print header with toggle
        process.stdout.write(ansi.hideCursor);
        console.log(
          color.cyan("? ") +
            color.bold(message) +
            " " +
            renderToggle(state) +
            color.dim(" (←/→ or h/l to toggle, enter to confirm)"),
        );
      } else {
        // Update the line
        process.stdout.write(ansi.moveUp(1) + ansi.moveToColumn0 + ansi.clearLine);
        console.log(
          color.cyan("? ") +
            color.bold(message) +
            " " +
            renderToggle(state) +
            color.dim(" (←/→ or h/l to toggle, enter to confirm)"),
        );
      }
    },

    handleKey: (key, rawState) => {
      const state = rawState as ToggleState;

      // Toggle on left/right, h/l, or space
      if (
        key.name === "left" ||
        key.name === "right" ||
        key.name === "h" ||
        key.name === "l" ||
        key.name === "space" ||
        key.name === "tab"
      ) {
        return { done: false, state: { ...state, value: !state.value } };
      }

      // Confirm with enter
      if (key.name === "return") {
        process.stdout.write(ansi.showCursor);
        // Clear and show result
        process.stdout.write(ansi.moveUp(1) + ansi.moveToColumn0 + ansi.clearLine);
        const resultLabel = state.value ? state.activeLabel : state.inactiveLabel;
        console.log(color.cyan("? ") + color.bold(message) + " " + color.cyan(resultLabel));
        return { done: true, value: state.value };
      }

      // Cancel
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

    fallback: async () => toggleFallback(options),
  });
}

/**
 * Fallback for non-TTY environments
 */
async function toggleFallback(options: ToggleOptions): Promise<boolean> {
  const { message, default: defaultValue = false, active = "Yes", inactive = "No" } = options;

  const schema = linePrompt<boolean>({
    message,
    default: defaultValue,

    hint: () => `${inactive}/${active}, default: ${defaultValue ? active : inactive}`,

    parse: (raw, isEmpty) => {
      if (isEmpty) {
        return { ok: true, value: defaultValue };
      }

      const lower = raw.toLowerCase();

      // Match active label
      if (
        lower === active.toLowerCase() ||
        lower === "y" ||
        lower === "yes" ||
        lower === "true" ||
        lower === "1"
      ) {
        return { ok: true, value: true };
      }

      // Match inactive label
      if (
        lower === inactive.toLowerCase() ||
        lower === "n" ||
        lower === "no" ||
        lower === "false" ||
        lower === "0"
      ) {
        return { ok: true, value: false };
      }

      return { ok: false, error: `Please enter ${active} or ${inactive}` };
    },
  });

  return runPrompt(schema);
}

/**
 * Prompt for a boolean toggle between two labeled states
 *
 * Use left/right arrows, h/l keys, or space to toggle.
 * More visual alternative to confirm() for on/off settings.
 *
 * @example
 * ```typescript
 * const darkMode = await toggle({
 *   message: "Enable dark mode?",
 *   active: "On",
 *   inactive: "Off",
 *   default: true,
 * });
 * ```
 */
export async function toggle(options: ToggleOptions): Promise<boolean> {
  const schema = createToggleSchema(options);
  return runPrompt(schema);
}
