# boune

A modern CLI framework for [Bun](https://bun.sh).

## Features

- **TypeScript-first** - Full type inference for commands, arguments, and options
- **Fluent API** - Chainable builder pattern for defining CLIs
- **Subcommands** - Nested command hierarchies with aliases
- **Auto-generated help** - `--help` and `--version` out of the box
- **Argument parsing** - Required, optional, and variadic positional arguments
- **Option parsing** - Short/long flags, typed values, defaults, environment variables
- **Interactive prompts** - Text input, confirmations, selections
- **Hooks** - Middleware for pre/post action and error handling
- **Output utilities** - Colors, tables, spinners, formatted messages
- **Zero dependencies** - Built specifically for Bun's APIs

## Installation

```bash
bun add boune
```

## Quick Start

```ts
import { cli, command } from "boune";

const greet = command("greet")
  .description("Greet someone")
  .argument("<name>", "Name to greet")
  .option("-l, --loud", "Shout the greeting")
  .action(({ args, options }) => {
    const msg = `Hello, ${args.name}!`;
    console.log(options.loud ? msg.toUpperCase() : msg);
  });

cli("my-app")
  .version("1.0.0")
  .command(greet)
  .run();
```

```bash
$ my-app greet World --loud
HELLO, WORLD!

$ my-app --help
Usage:
  my-app <command> [options]

Commands:
  greet  Greet someone

Options:
  -h, --help     Show help
  -V, --version  Show version
```

## Arguments

```ts
// Required argument
command("greet").argument("<name>", "Name to greet");

// Optional argument with default
command("greet").argument("[name]", "Name", { default: "World" });

// Variadic argument (collects remaining args)
command("cat").argument("<files...>", "Files to concatenate");

// Typed argument
command("repeat").argument("<count>", "Times to repeat", { type: "number" });
```

## Options

```ts
// Boolean flag
command("build").option("-v, --verbose", "Verbose output");

// Option with value
command("build").option("-o, --output <dir>", "Output directory");

// Typed option with default
command("serve").option("-p, --port <number>", "Port", {
  type: "number",
  default: 3000,
});

// Environment variable fallback
command("deploy").option("--token <string>", "API token", {
  env: "API_TOKEN",
  required: true,
});
```

## Subcommands

```ts
const watch = command("watch")
  .description("Watch mode")
  .action(() => console.log("Watching..."));

const build = command("build")
  .description("Build project")
  .subcommand(watch)
  .action(() => console.log("Building..."));

cli("my-app").command(build).run();
```

```bash
$ my-app build        # runs build action
$ my-app build watch  # runs watch action
```

## Hooks

```ts
cli("my-app")
  .hook("preAction", ({ command }) => {
    console.log(`Running: ${command.name}`);
  })
  .hook("postAction", () => {
    console.log("Done!");
  })
  .hook("preError", ({ error }) => {
    // Custom error handling
  });
```

## Interactive Prompts

```ts
import { text, confirm, select } from "boune/prompt";

const name = await text({
  message: "Project name:",
  default: "my-project",
});

const useTS = await confirm({
  message: "Use TypeScript?",
  default: true,
});

const framework = await select({
  message: "Select framework:",
  options: [
    { label: "React", value: "react" },
    { label: "Vue", value: "vue" },
    { label: "Svelte", value: "svelte" },
  ],
});
```

## Output Utilities

```ts
import { color, createSpinner, table } from "boune";

// Colors
console.log(color.green("Success!"));
console.log(color.red("Error!"));
console.log(color.bold(color.cyan("Bold cyan")));

// Spinner
const spinner = createSpinner("Loading...").start();
await doWork();
spinner.succeed("Done!");

// Table
console.log(table([
  ["Name", "Status"],
  ["Task 1", "Done"],
  ["Task 2", "Pending"],
]));
```

## Compile to Binary

Bun can compile your CLI to a standalone executable:

```bash
bun build ./cli.ts --compile --outfile my-app
```

## Examples

See the [examples](./examples) directory:

- `demo.ts` - Basic CLI features
- `git-like.ts` - Git-like subcommand structure
- `file-tool.ts` - File operations with Bun APIs
- `http-client.ts` - HTTP client with fetch
- `task-manager.ts` - SQLite persistence with bun:sqlite
- `hooks-example.ts` - Middleware and hooks

Run an example:

```bash
bun examples/demo.ts --help
```

## License

This project is licensed under the [MIT License](./LICENSE)
