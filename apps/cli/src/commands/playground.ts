import { color, defineCommand } from "boune";
import { confirm, date, editor, form, list, multiselect, select, text, toggle } from "boune/prompt";

export type PromptType =
  | "text"
  | "confirm"
  | "select"
  | "multiselect"
  | "editor"
  | "toggle"
  | "list"
  | "date"
  | "form";

export interface SelectOption {
  label: string;
  value: string;
  hint?: string;
}

export const playground = defineCommand({
  name: "playground",
  description: "Interactively test and explore boune prompts",
  async action() {
    console.log("");
    console.log(color.bold(color.cyan("  Boune Prompt Playground")));
    console.log(color.dim("  Test and explore different prompt types\n"));

    while (true) {
      const promptType = await select<PromptType>({
        message: "Select a prompt type to try:",
        options: [
          { label: "text", value: "text", hint: "Single-line text input" },
          { label: "confirm", value: "confirm", hint: "Yes/No confirmation" },
          { label: "select", value: "select", hint: "Single selection from list" },
          { label: "multiselect", value: "multiselect", hint: "Multiple selections from list" },
          { label: "editor", value: "editor", hint: "Open $EDITOR for long text" },
          { label: "toggle", value: "toggle", hint: "Visual on/off switch" },
          { label: "list", value: "list", hint: "Comma-separated list input" },
          { label: "date", value: "date", hint: "Interactive calendar date picker" },
          { label: "form", value: "form", hint: "Multi-field form input" },
          { label: "Exit", value: "exit" as PromptType, hint: "Exit playground" },
        ],
      });

      if (promptType === ("exit" as PromptType)) {
        console.log(color.dim("\nGoodbye!\n"));
        break;
      }

      console.log("");

      switch (promptType) {
        case "text":
          await runTextDemo();
          break;
        case "confirm":
          await runConfirmDemo();
          break;
        case "select":
          await runSelectDemo();
          break;
        case "multiselect":
          await runMultiselectDemo();
          break;
        case "editor":
          await runEditorDemo();
          break;
        case "toggle":
          await runToggleDemo();
          break;
        case "list":
          await runListDemo();
          break;
        case "date":
          await runDateDemo();
          break;
        case "form":
          await runFormDemo();
          break;
      }

      console.log("");
    }
  },
});

async function runTextDemo(): Promise<void> {
  console.log(color.bold("Configure text prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Enter your name:",
    default: "Enter your name:",
  });

  const placeholder = await text({
    message: "Placeholder text (optional):",
    placeholder: "john_doe",
    default: "",
  });

  const defaultValue = await text({
    message: "Default value (optional):",
    placeholder: "",
    default: "",
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await text({
    message,
    placeholder: placeholder || undefined,
    default: defaultValue || undefined,
  });

  printResult(result);
  printCodeSnippet("text", {
    message,
    placeholder: placeholder || undefined,
    default: defaultValue || undefined,
  });
}

async function runConfirmDemo(): Promise<void> {
  console.log(color.bold("Configure confirm prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Are you sure?",
    default: "Are you sure?",
  });

  const initialValue = await confirm({
    message: "Default value:",
    default: true,
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await confirm({
    message,
    default: initialValue,
  });

  printResult(result);
  printCodeSnippet("confirm", {
    message,
    default: initialValue,
  });
}

async function runSelectDemo(): Promise<void> {
  console.log(color.bold("Configure select prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Select an option:",
    default: "Select an option:",
  });

  const options = await buildSelectOptions();

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await select({
    message,
    options,
  });

  printResult(result);
  printCodeSnippet("select", { message, options });
}

async function runMultiselectDemo(): Promise<void> {
  console.log(color.bold("Configure multiselect prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Select options:",
    default: "Select options:",
  });

  const options = await buildSelectOptions();

  const required = await confirm({
    message: "Require at least one selection?",
    default: false,
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await multiselect({
    message,
    options,
  });

  printResult(result);
  printCodeSnippet("multiselect", { message, options, required });
}

async function runEditorDemo(): Promise<void> {
  console.log(color.bold("Configure editor prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Enter description:",
    default: "Enter description:",
  });

  const extension = await select({
    message: "File extension (for syntax highlighting):",
    options: [
      { label: "txt", value: "txt", hint: "Plain text" },
      { label: "md", value: "md", hint: "Markdown" },
      { label: "json", value: "json", hint: "JSON" },
      { label: "ts", value: "ts", hint: "TypeScript" },
      { label: "js", value: "js", hint: "JavaScript" },
    ],
  });

  const defaultContent = await text({
    message: "Default content (optional):",
    placeholder: "",
    default: "",
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await editor({
    message,
    extension,
    default: defaultContent || undefined,
  });

  printResult(result);
  printCodeSnippet("editor", {
    message,
    extension,
    default: defaultContent || undefined,
  });
}

async function runToggleDemo(): Promise<void> {
  console.log(color.bold("Configure toggle prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Enable feature?",
    default: "Enable feature?",
  });

  const activeLabel = await text({
    message: "Active label (when on):",
    placeholder: "Yes",
    default: "Yes",
  });

  const inactiveLabel = await text({
    message: "Inactive label (when off):",
    placeholder: "No",
    default: "No",
  });

  const defaultValue = await confirm({
    message: "Default value:",
    default: false,
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await toggle({
    message,
    active: activeLabel,
    inactive: inactiveLabel,
    default: defaultValue,
  });

  printResult(result);
  printCodeSnippet("toggle", {
    message,
    active: activeLabel,
    inactive: inactiveLabel,
    default: defaultValue,
  });
}

async function runListDemo(): Promise<void> {
  console.log(color.bold("Configure list prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Enter tags:",
    default: "Enter tags:",
  });

  const separator = await text({
    message: "Separator:",
    placeholder: ",",
    default: ",",
  });

  const minItems = await text({
    message: "Minimum items (optional):",
    placeholder: "",
    default: "",
  });

  const maxItems = await text({
    message: "Maximum items (optional):",
    placeholder: "",
    default: "",
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await list({
    message,
    separator: separator || ",",
    min: minItems ? parseInt(minItems, 10) : undefined,
    max: maxItems ? parseInt(maxItems, 10) : undefined,
  });

  printResult(result);
  printCodeSnippet("list", {
    message,
    separator: separator !== "," ? separator : undefined,
    min: minItems ? parseInt(minItems, 10) : undefined,
    max: maxItems ? parseInt(maxItems, 10) : undefined,
  });
}

async function runDateDemo(): Promise<void> {
  console.log(color.bold("Configure date prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Select a date:",
    default: "Select a date:",
  });

  const format = await select({
    message: "Date format:",
    options: [
      { label: "YYYY-MM-DD", value: "YYYY-MM-DD", hint: "ISO format (2024-12-25)" },
      { label: "MM/DD/YYYY", value: "MM/DD/YYYY", hint: "US format (12/25/2024)" },
      { label: "DD/MM/YYYY", value: "DD/MM/YYYY", hint: "EU format (25/12/2024)" },
    ],
  });

  const useMin = await confirm({
    message: "Set minimum date (today)?",
    default: false,
  });

  const useMax = await confirm({
    message: "Set maximum date (30 days from now)?",
    default: false,
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const result = await date({
    message,
    format: format as "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY",
    min: useMin ? today : undefined,
    max: useMax ? thirtyDaysFromNow : undefined,
  });

  printResult(result.toISOString().split("T")[0]);
  printCodeSnippet("date", {
    message,
    format,
    min: useMin ? "new Date()" : undefined,
    max: useMax ? "new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)" : undefined,
  });
}

async function runFormDemo(): Promise<void> {
  console.log(color.bold("Configure form prompt:\n"));
  console.log(color.dim("This demo uses a pre-configured user registration form.\n"));

  const message = await text({
    message: "Form title:",
    placeholder: "Create account:",
    default: "Create account:",
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await form({
    message,
    fields: [
      { name: "username", label: "Username", required: true, placeholder: "johndoe" },
      {
        name: "email",
        label: "Email",
        required: true,
        placeholder: "john@example.com",
        validate: (v) => (v.includes("@") ? true : "Must be a valid email"),
      },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "age", label: "Age", type: "number", placeholder: "25" },
    ],
  });

  printResult(result);
  printCodeSnippet("form", {
    message,
    fields: `[
    { name: "username", label: "Username", required: true },
    { name: "email", label: "Email", required: true, validate: (v) => v.includes("@") ? true : "Invalid" },
    { name: "password", label: "Password", type: "password", required: true },
    { name: "age", label: "Age", type: "number" },
  ]`,
  });
}

async function buildSelectOptions(): Promise<SelectOption[]> {
  const options: SelectOption[] = [];

  console.log(color.dim("\nAdd options (at least 2 required):\n"));

  while (true) {
    const label = await text({
      message: `Option ${options.length + 1} label:`,
      placeholder: options.length === 0 ? "Option A" : options.length === 1 ? "Option B" : "",
      default: options.length === 0 ? "Option A" : options.length === 1 ? "Option B" : "",
    });

    if (!label && options.length >= 2) {
      break;
    }

    if (!label) {
      console.log(color.yellow("  Please add at least 2 options"));
      continue;
    }

    const value = await text({
      message: "Option value:",
      placeholder: label.toLowerCase().replace(/\s+/g, "_"),
      default: label.toLowerCase().replace(/\s+/g, "_"),
    });

    const hint = await text({
      message: "Option hint (optional):",
      placeholder: "",
      default: "",
    });

    options.push({
      label,
      value,
      hint: hint || undefined,
    });

    if (options.length >= 2) {
      const addMore = await confirm({
        message: "Add another option?",
        default: false,
      });
      if (!addMore) break;
    }
  }

  return options;
}

function printResult(result: unknown): void {
  console.log("");
  console.log(color.bold("Result:"));
  console.log(color.green(`  ${JSON.stringify(result)}`));
}

function printCodeSnippet(type: PromptType, config: Record<string, unknown>): void {
  console.log("");
  console.log(color.bold("Code:"));
  console.log(color.dim("─".repeat(40)));

  const lines: string[] = [];
  lines.push(`import { ${type} } from "boune/prompt";`);
  lines.push("");

  const varName = getVariableName(type);
  const configStr = formatConfig(config);

  lines.push(`const ${varName} = await ${type}(${configStr});`);

  for (const line of lines) {
    console.log(color.cyan(`  ${line}`));
  }

  console.log(color.dim("─".repeat(40)));
}

export function getVariableName(type: PromptType): string {
  switch (type) {
    case "text":
      return "answer";
    case "confirm":
      return "confirmed";
    case "select":
      return "selected";
    case "multiselect":
      return "selections";
    case "editor":
      return "content";
    case "toggle":
      return "enabled";
    case "list":
      return "items";
    case "date":
      return "selectedDate";
    case "form":
      return "formData";
  }
}

export function formatConfig(config: Record<string, unknown>): string {
  const entries = Object.entries(config).filter(([_, v]) => v !== undefined && v !== "");

  if (entries.length === 0) {
    return "{}";
  }

  const lines: string[] = ["{"];

  for (const [key, value] of entries) {
    if (key === "options" && Array.isArray(value)) {
      lines.push(`  ${key}: [`);
      for (const opt of value as SelectOption[]) {
        const optParts: string[] = [`label: "${opt.label}"`, `value: "${opt.value}"`];
        if (opt.hint) {
          optParts.push(`hint: "${opt.hint}"`);
        }
        lines.push(`    { ${optParts.join(", ")} },`);
      }
      lines.push("  ],");
    } else if (typeof value === "string") {
      lines.push(`  ${key}: "${value}",`);
    } else {
      lines.push(`  ${key}: ${JSON.stringify(value)},`);
    }
  }

  lines.push("}");
  return lines.join("\n  ");
}
