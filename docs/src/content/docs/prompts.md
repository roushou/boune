---
title: Prompts
description: Create interactive CLI experiences with built-in prompts.
---

Boune includes a complete set of interactive prompts for gathering user input. Prompts can be defined declaratively in your commands or used standalone.

> **Tip:** If you've cloned the repo, test prompts interactively:
>
> ```bash
> bun run dev prompt          # Interactive menu
> bun run dev prompt select   # Test a specific prompt
> ```

## Declarative Prompts

Define prompts directly in your command and run them lazily:

```typescript
import { defineCommand } from "boune";

const init = defineCommand({
  name: "init",
  description: "Initialize a new project",
  prompts: {
    name: { kind: "text", message: "Project name:", default: "my-project" },
    template: {
      kind: "select",
      message: "Choose a template:",
      options: [
        { label: "Basic", value: "basic" },
        { label: "Full", value: "full", hint: "With tests and linting" },
      ] as const,
      default: "basic",
    },
    useGit: { kind: "confirm", message: "Initialize git?", default: true },
  },
  async action({ prompts }) {
    const name = await prompts.name.run();
    const template = await prompts.template.run();
    const useGit = await prompts.useGit.run();

    console.log(`Creating ${name} with ${template} template...`);
    if (useGit) console.log("Initializing git...");
  },
});
```

## Prompt Types

### Text

Basic text input with optional defaults and validation:

```typescript
prompts: {
  name: {
    kind: "text",
    message: "What is your name?",
    default: "World",
    placeholder: "Enter your name",
  },
}
```

#### With Validation

```typescript
prompts: {
  email: {
    kind: "text",
    message: "Enter your email:",
    validator: { email: true },
  },
}
```

### Number

Prompt for numeric values with constraints:

```typescript
prompts: {
  port: {
    kind: "number",
    message: "Port number:",
    default: 3000,
    min: 1,
    max: 65535,
    integer: true,
  },
}
```

#### Properties

| Property    | Type      | Description           |
| ----------- | --------- | --------------------- |
| `message`   | `string`  | Prompt message        |
| `default`   | `number`  | Default value         |
| `min`       | `number`  | Minimum allowed value |
| `max`       | `number`  | Maximum allowed value |
| `integer`   | `boolean` | Only allow integers   |
| `step`      | `number`  | Increment step        |
| `validator` | `object`  | Validation rules      |

### Confirm

Yes/no confirmation:

```typescript
prompts: {
  proceed: {
    kind: "confirm",
    message: "Deploy to production?",
    default: false,
  },
}
```

```
? Deploy to production? (y/N) y
```

### Select

Single selection from a list:

```typescript
prompts: {
  framework: {
    kind: "select",
    message: "Choose a framework:",
    options: [
      { label: "React", value: "react", hint: "Popular UI library" },
      { label: "Vue", value: "vue", hint: "Progressive framework" },
      { label: "Svelte", value: "svelte", hint: "Compiled framework" },
      { label: "Angular", value: "angular" },
    ] as const,
    default: "react",
  },
}
```

Use arrow keys or `j`/`k` to navigate, Enter to select.

### Multiselect

Multiple selections:

```typescript
prompts: {
  features: {
    kind: "multiselect",
    message: "Select features to enable:",
    options: [
      { label: "TypeScript", value: "typescript" },
      { label: "ESLint", value: "eslint" },
      { label: "Prettier", value: "prettier" },
      { label: "Testing", value: "testing" },
    ] as const,
    min: 1,  // Require at least 1 selection
    max: 3,  // Allow at most 3 selections
  },
}
```

Use Space to toggle selection, `a` to toggle all, Enter to confirm.

### Password

Secure password input:

```typescript
prompts: {
  apiKey: {
    kind: "password",
    message: "Enter your API key:",
    validator: { minLength: 10 },
  },
}
```

### Autocomplete

Searchable selection with fuzzy matching:

```typescript
prompts: {
  country: {
    kind: "autocomplete",
    message: "Select a country:",
    options: [
      { label: "United States", value: "us" },
      { label: "United Kingdom", value: "uk" },
      { label: "Germany", value: "de" },
      { label: "France", value: "fr" },
      { label: "Japan", value: "jp" },
    ],
    limit: 5,           // Show 5 options at a time
    allowCustom: false, // Only allow selecting from list
  },
}
```

#### Allow Custom Values

```typescript
prompts: {
  tag: {
    kind: "autocomplete",
    message: "Select or enter a tag:",
    options: existingTags.map((t) => ({ label: t, value: t })),
    allowCustom: true, // Allow typing new values
  },
}
```

### Filepath

Interactive file/directory browser:

```typescript
prompts: {
  configFile: {
    kind: "filepath",
    message: "Select a config file:",
    basePath: "./configs",
    extensions: [".json", ".yaml", ".toml"],
  },
}
```

#### Properties

| Property        | Type       | Description                       |
| --------------- | ---------- | --------------------------------- |
| `message`       | `string`   | Prompt message                    |
| `basePath`      | `string`   | Starting directory (default: cwd) |
| `extensions`    | `string[]` | Filter by extensions              |
| `directoryOnly` | `boolean`  | Only show directories             |
| `fileOnly`      | `boolean`  | Only show files                   |
| `allowNew`      | `boolean`  | Allow non-existent paths          |
| `showHidden`    | `boolean`  | Show dotfiles                     |
| `limit`         | `number`   | Max visible items                 |

#### Directory Selection

```typescript
prompts: {
  outputDir: {
    kind: "filepath",
    message: "Select output directory:",
    directoryOnly: true,
  },
}
```

## Standalone Prompts

You can also use prompts outside of commands:

```typescript
import { text, select, confirm } from "boune/prompt";

const name = await text({
  message: "What is your name?",
  default: "World",
});

const framework = await select({
  message: "Choose a framework:",
  options: [
    { label: "React", value: "react" },
    { label: "Vue", value: "vue" },
  ],
});

const proceed = await confirm({
  message: "Continue?",
  default: true,
});
```

## Conditional Prompts

Run prompts conditionally based on previous answers:

```typescript
const setup = defineCommand({
  name: "setup",
  prompts: {
    useDatabase: { kind: "confirm", message: "Use a database?", default: false },
    dbType: {
      kind: "select",
      message: "Database type:",
      options: [
        { label: "PostgreSQL", value: "postgres" },
        { label: "MySQL", value: "mysql" },
        { label: "SQLite", value: "sqlite" },
      ] as const,
    },
  },
  async action({ prompts }) {
    const useDatabase = await prompts.useDatabase.run();

    if (useDatabase) {
      const dbType = await prompts.dbType.run();
      console.log(`Setting up ${dbType}...`);
    }
  },
});
```

## Arguments with Prompt Fallback

Use prompts when arguments aren't provided:

```typescript
const greet = defineCommand({
  name: "greet",
  arguments: {
    name: { type: "string", description: "Name to greet" },
  },
  prompts: {
    name: { kind: "text", message: "What is your name?" },
  },
  async action({ args, prompts }) {
    const name = args.name || (await prompts.name.run());
    console.log(`Hello, ${name}!`);
  },
});
```

```bash
myapp greet Alice  # Uses argument
myapp greet        # Prompts for name
```

## Non-TTY Fallback

All prompts automatically fall back to simple numbered/text input when running in non-interactive environments (CI, pipes, etc.):

```bash
# Interactive mode - full UI
./mycli init

# Non-TTY - simple fallback
echo "1" | ./mycli init
```

## Next Steps

- [Output & Styling](/docs/output) - Format CLI output
- [Validation](/docs/validation) - Validate user input
