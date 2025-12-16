import {
  autocomplete,
  confirm,
  filepath,
  multiselect,
  number,
  password,
  select,
  text,
} from "boune/prompt";
import { color, defineCommand } from "boune";

const PROMPT_TYPES = [
  "text",
  "password",
  "number",
  "confirm",
  "select",
  "multiselect",
  "autocomplete",
  "filepath",
] as const;

type PromptType = (typeof PROMPT_TYPES)[number];

export const prompt = defineCommand({
  name: "prompt",
  description: "Test prompt types interactively",
  arguments: {
    type: {
      type: "string",
      required: false,
      description: `Prompt type (${PROMPT_TYPES.join(", ")})`,
    },
  },
  options: {
    list: {
      type: "boolean",
      short: "l",
      description: "List available prompt types",
    },
  },
  async action({ args, options }) {
    if (options.list) {
      console.log(color.bold("\nAvailable prompt types:\n"));
      for (const type of PROMPT_TYPES) {
        console.log(`  ${color.cyan(type)}`);
      }
      console.log("");
      return;
    }

    let promptType = args.type as PromptType | undefined;

    if (!promptType) {
      promptType = await select({
        message: "Select a prompt type to test:",
        options: PROMPT_TYPES.map((t) => ({ label: t, value: t })),
      });
    }

    if (!PROMPT_TYPES.includes(promptType as PromptType)) {
      console.log(color.red(`\nUnknown prompt type: ${promptType}`));
      console.log(`Available: ${PROMPT_TYPES.join(", ")}\n`);
      process.exit(1);
    }

    console.log(color.bold(`\nTesting ${color.cyan(promptType)} prompt\n`));
    console.log(color.dim("─".repeat(40)));
    console.log("");

    const result = await runPrompt(promptType);

    console.log("");
    console.log(color.dim("─".repeat(40)));
    console.log(color.bold("\nResult:"));
    console.log(color.green(JSON.stringify(result, null, 2)));
    console.log("");
  },
});

async function runPrompt(type: PromptType): Promise<unknown> {
  switch (type) {
    case "text":
      return text({
        message: "Enter some text:",
        placeholder: "Type something...",
      });

    case "password":
      return password({
        message: "Enter a password:",
      });

    case "number":
      return number({
        message: "Enter a number:",
        min: 0,
        max: 100,
      });

    case "confirm":
      return confirm({
        message: "Do you confirm?",
        default: true,
      });

    case "select":
      return select({
        message: "Pick an option:",
        options: [
          { label: "Option A", value: "a", hint: "First option" },
          { label: "Option B", value: "b", hint: "Second option" },
          { label: "Option C", value: "c", hint: "Third option" },
        ],
      });

    case "multiselect":
      return multiselect({
        message: "Select multiple options:",
        options: [
          { label: "TypeScript", value: "ts" },
          { label: "JavaScript", value: "js" },
          { label: "Rust", value: "rust" },
          { label: "Go", value: "go" },
        ],
      });

    case "autocomplete":
      return autocomplete({
        message: "Search for a framework:",
        options: [
          { label: "React", value: "react" },
          { label: "Vue", value: "vue" },
          { label: "Svelte", value: "svelte" },
          { label: "Angular", value: "angular" },
          { label: "Solid", value: "solid" },
          { label: "Preact", value: "preact" },
          { label: "Qwik", value: "qwik" },
        ],
      });

    case "filepath":
      return filepath({
        message: "Select a file:",
      });
  }
}
