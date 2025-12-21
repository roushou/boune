import {
  PromptCancelledError,
  autocomplete,
  confirm,
  date,
  editor,
  filepath,
  form,
  list,
  multiselect,
  number,
  password,
  select,
  text,
  toggle,
} from "boune/prompt";
import { color, createDraft, createSpinner, defineCommand } from "boune";

export type PromptType =
  | "text"
  | "password"
  | "number"
  | "confirm"
  | "select"
  | "multiselect"
  | "autocomplete"
  | "filepath"
  | "editor"
  | "toggle"
  | "list"
  | "date"
  | "form"
  | "draft"
  | "spinner";

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

    try {
      while (true) {
        const promptType = await select<PromptType>({
          message: "Select a prompt type to try:",
          options: [
            { label: "text", value: "text", hint: "Single-line text input" },
            { label: "password", value: "password", hint: "Hidden password input" },
            { label: "number", value: "number", hint: "Numeric input with validation" },
            { label: "confirm", value: "confirm", hint: "Yes/No confirmation" },
            { label: "select", value: "select", hint: "Single selection from list" },
            { label: "multiselect", value: "multiselect", hint: "Multiple selections from list" },
            { label: "autocomplete", value: "autocomplete", hint: "Searchable selection" },
            { label: "filepath", value: "filepath", hint: "File path with completion" },
            { label: "editor", value: "editor", hint: "Open $EDITOR for long text" },
            { label: "toggle", value: "toggle", hint: "Visual on/off switch" },
            { label: "list", value: "list", hint: "Comma-separated list input" },
            { label: "date", value: "date", hint: "Interactive calendar date picker" },
            { label: "form", value: "form", hint: "Multi-field form input" },
            { label: "draft", value: "draft", hint: "Live-updating multi-line output" },
            { label: "spinner", value: "spinner", hint: "Async operation spinner" },
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
          case "password":
            await runPasswordDemo();
            break;
          case "number":
            await runNumberDemo();
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
          case "autocomplete":
            await runAutocompleteDemo();
            break;
          case "filepath":
            await runFilepathDemo();
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
          case "draft":
            await runDraftDemo();
            break;
          case "spinner":
            await runSpinnerDemo();
            break;
        }

        console.log("");
      }
    } catch (err) {
      if (err instanceof PromptCancelledError) {
        console.log(color.dim("\n\nGoodbye!\n"));
        return;
      }
      throw err;
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

async function runPasswordDemo(): Promise<void> {
  console.log(color.bold("Configure password prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Enter your password:",
    default: "Enter your password:",
  });

  const useMask = await confirm({
    message: "Show mask characters?",
    default: true,
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const _result = await password({
    message,
    mask: useMask ? "*" : undefined,
  });

  printResult("(hidden)");
  printCodeSnippet("password", {
    message,
    mask: useMask ? "*" : undefined,
  });
}

async function runNumberDemo(): Promise<void> {
  console.log(color.bold("Configure number prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Enter a number:",
    default: "Enter a number:",
  });

  const minValue = await text({
    message: "Minimum value (optional):",
    placeholder: "",
    default: "",
  });

  const maxValue = await text({
    message: "Maximum value (optional):",
    placeholder: "",
    default: "",
  });

  const stepValue = await text({
    message: "Step value (optional):",
    placeholder: "1",
    default: "",
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await number({
    message,
    min: minValue ? parseFloat(minValue) : undefined,
    max: maxValue ? parseFloat(maxValue) : undefined,
    step: stepValue ? parseFloat(stepValue) : undefined,
  });

  printResult(result);
  printCodeSnippet("number", {
    message,
    min: minValue ? parseFloat(minValue) : undefined,
    max: maxValue ? parseFloat(maxValue) : undefined,
    step: stepValue ? parseFloat(stepValue) : undefined,
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

async function runAutocompleteDemo(): Promise<void> {
  console.log(color.bold("Configure autocomplete prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Search for a language:",
    default: "Search for a language:",
  });

  console.log(color.dim("\nUsing demo options: JavaScript, TypeScript, Python, Ruby, Go, Rust\n"));

  console.log(color.dim("--- Running your prompt ---\n"));

  const result = await autocomplete({
    message,
    options: [
      { label: "JavaScript", value: "javascript" },
      { label: "TypeScript", value: "typescript" },
      { label: "Python", value: "python" },
      { label: "Ruby", value: "ruby" },
      { label: "Go", value: "go" },
      { label: "Rust", value: "rust" },
    ],
  });

  printResult(result);
  printCodeSnippet("autocomplete", {
    message,
    options: [
      { label: "JavaScript", value: "javascript" },
      { label: "TypeScript", value: "typescript" },
      { label: "Python", value: "python" },
    ],
  });
}

async function runFilepathDemo(): Promise<void> {
  console.log(color.bold("Configure filepath prompt:\n"));

  const message = await text({
    message: "Prompt message:",
    placeholder: "Select a file:",
    default: "Select a file:",
  });

  const onlyDirectories = await confirm({
    message: "Only show directories?",
    default: false,
  });

  console.log(color.dim("\n--- Running your prompt ---\n"));

  const result = await filepath({
    message,
    directoryOnly: true,
  });

  printResult(result);
  printCodeSnippet("filepath", {
    message,
    onlyDirectories: onlyDirectories || undefined,
  });
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

function progressBar(percent: number, width = 20): string {
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;
  return color.cyan("█".repeat(filled)) + color.dim("░".repeat(empty));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function runDraftDemo(): Promise<void> {
  console.log(color.bold("Draft Output Demo: Parallel Downloads\n"));
  console.log(color.dim("Simulating docker-style parallel layer downloads.\n"));

  await Bun.sleep(300);

  const draft = createDraft();

  // Combine layer info with mutable state into single objects
  const layers = [
    { name: "sha256:a3ed95", totalSize: 2.4 * 1024 * 1024, speed: 1.8 },
    { name: "sha256:f18bc8", totalSize: 8.7 * 1024 * 1024, speed: 2.4 },
    { name: "sha256:d9e134", totalSize: 4.2 * 1024 * 1024, speed: 1.2 },
    { name: "sha256:7b2314", totalSize: 12.1 * 1024 * 1024, speed: 3.1 },
    { name: "sha256:9c8a22", totalSize: 1.8 * 1024 * 1024, speed: 0.9 },
  ].map((layer) => ({
    ...layer,
    line: draft.addLine(`${layer.name}: waiting...`),
    progress: 0,
    downloaded: 0,
    completed: false,
  }));

  // Run downloads in parallel with different speeds
  const interval = 50;
  const startTime = Date.now();

  while (!layers.every((l) => l.completed)) {
    await Bun.sleep(interval);

    for (const layer of layers) {
      if (layer.completed) continue;

      // Add some randomness to speed
      const actualSpeed = layer.speed * (0.7 + Math.random() * 0.6);
      layer.downloaded += actualSpeed * 1024 * 1024 * (interval / 1000);
      layer.progress = Math.min(100, (layer.downloaded / layer.totalSize) * 100);

      if (layer.progress >= 100) {
        layer.completed = true;
        layer.line.done(
          `${layer.name}: ${formatBytes(layer.totalSize)} ${color.dim("— complete")}`,
        );
      } else {
        const bar = progressBar(layer.progress);
        const pct = `${Math.floor(layer.progress)}%`.padStart(4);
        const size = `${formatBytes(layer.downloaded)}/${formatBytes(layer.totalSize)}`;
        const speedStr = color.dim(`${actualSpeed.toFixed(1)}MB/s`);
        layer.line.update(`${layer.name}: ${bar} ${pct} ${size} ${speedStr}`);
      }
    }
  }

  draft.stop();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(color.dim(`\nCompleted in ${elapsed}s\n`));

  console.log(color.bold("Code:"));
  console.log(color.dim("─".repeat(40)));
  console.log(color.cyan(`  import { createDraft } from "boune";`));
  console.log(color.cyan(``));
  console.log(color.cyan(`  const draft = createDraft();`));
  console.log(color.cyan(`  const layer1 = draft.addLine("Downloading...");`));
  console.log(color.cyan(`  const layer2 = draft.addLine("Downloading...");`));
  console.log(color.cyan(``));
  console.log(color.cyan(`  // Update with progress bars`));
  console.log(color.cyan(`  layer1.update("████████░░░░ 67% 4.2MB/6.3MB");`));
  console.log(color.cyan(`  layer1.done("layer1: 6.3MB — complete");`));
  console.log(color.cyan(``));
  console.log(color.cyan(`  draft.stop();`));
  console.log(color.dim("─".repeat(40)));
}

async function runSpinnerDemo(): Promise<void> {
  console.log(color.bold("Spinner Demo: Async Operations\n"));
  console.log(color.dim("Demonstrating spinner states: loading, success, and failure.\n"));

  await Bun.sleep(300);

  // Demo 1: Successful operation
  const spinner1 = createSpinner("Connecting to server...").start();
  await Bun.sleep(1500);
  spinner1.succeed("Connected to server");

  await Bun.sleep(500);

  // Demo 2: Another successful operation
  const spinner2 = createSpinner("Fetching data...", { spinnerColor: "magenta" }).start();
  await Bun.sleep(2000);
  spinner2.succeed("Data fetched successfully");

  await Bun.sleep(500);

  // Demo 3: Failed operation
  const spinner3 = createSpinner("Validating credentials...", { spinnerColor: "yellow" }).start();
  await Bun.sleep(1500);
  spinner3.fail("Invalid credentials");

  await Bun.sleep(500);

  // Demo 4: Custom colors
  const spinner4 = createSpinner("Processing with custom colors...", {
    spinnerColor: "blue",
    successColor: "cyan",
  }).start();
  await Bun.sleep(1500);
  spinner4.succeed("Processing complete");

  console.log("");
  console.log(color.bold("Code:"));
  console.log(color.dim("─".repeat(40)));
  console.log(color.cyan(`  import { createSpinner } from "boune";`));
  console.log(color.cyan(``));
  console.log(color.cyan(`  const spinner = createSpinner("Loading...").start();`));
  console.log(color.cyan(`  await someAsyncTask();`));
  console.log(color.cyan(`  spinner.succeed("Done!");`));
  console.log(color.cyan(``));
  console.log(color.cyan(`  // With custom colors`));
  console.log(color.cyan(`  const spinner = createSpinner("Loading...", {`));
  console.log(color.cyan(`    spinnerColor: "magenta",`));
  console.log(color.cyan(`    successColor: "cyan",`));
  console.log(color.cyan(`    failColor: "red",`));
  console.log(color.cyan(`  }).start();`));
  console.log(color.cyan(``));
  console.log(color.cyan(`  // Methods`));
  console.log(color.cyan(`  spinner.succeed("Success message");`));
  console.log(color.cyan(`  spinner.fail("Error message");`));
  console.log(color.cyan(`  spinner.stop("Custom final text");`));
  console.log(color.dim("─".repeat(40)));
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
    case "password":
      return "secret";
    case "number":
      return "value";
    case "confirm":
      return "confirmed";
    case "select":
      return "selected";
    case "multiselect":
      return "selections";
    case "autocomplete":
      return "match";
    case "filepath":
      return "path";
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
    case "draft":
      return "draft";
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
