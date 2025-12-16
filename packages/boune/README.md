# boune

A modern CLI framework for [Bun](https://bun.sh).

## Features

- **TypeScript-first** - Full type inference for commands, arguments, and options
- **Declarative API** - Schema-based pattern for defining CLIs
- **Subcommands** - Nested command hierarchies with aliases
- **Auto-generated help** - `--help` and `--version` out of the box
- **Argument parsing** - Required, optional, and variadic positional arguments
- **Option parsing** - Short/long flags, typed values, defaults, environment variables
- **Interactive prompts** - Text input, confirmations, selections
- **Middleware** - Before/after hooks and error handling
- **Output utilities** - Colors, tables, spinners, formatted messages
- **Zero dependencies** - Built specifically for Bun's APIs

## Installation

```bash
bun add boune
```

## Quick Start

```ts
import { defineCli, defineCommand } from "boune";

const greet = defineCommand({
  name: "greet",
  description: "Greet someone",
  arguments: {
    name: { type: "string", required: true, description: "Name to greet" },
  },
  options: {
    loud: { type: "boolean", short: "l", description: "Shout the greeting" },
  },
  action({ args, options }) {
    const msg = `Hello, ${args.name}!`;
    console.log(options.loud ? msg.toUpperCase() : msg);
  },
});

defineCli({
  name: "my-app",
  version: "1.0.0",
  commands: { greet },
}).run();
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

Arguments are positional values passed to commands. Define them as plain objects with a `type` property.

```ts
// Required argument
defineCommand({
  name: "greet",
  arguments: {
    name: { type: "string", required: true, description: "Name to greet" },
  },
  action({ args }) {
    console.log(`Hello, ${args.name}!`);
  },
});

// Optional argument with default
defineCommand({
  name: "greet",
  arguments: {
    name: { type: "string", default: "World", description: "Name to greet" },
  },
  action({ args }) {
    console.log(`Hello, ${args.name}!`);
  },
});

// Variadic argument (collects remaining args)
defineCommand({
  name: "cat",
  arguments: {
    files: { type: "string", required: true, variadic: true, description: "Files to concatenate" },
  },
  action({ args }) {
    // args.files is string[]
  },
});

// Typed argument
defineCommand({
  name: "repeat",
  arguments: {
    count: { type: "number", required: true, description: "Times to repeat" },
  },
  action({ args }) {
    // args.count is number
  },
});
```

## Options

Options are named flags that modify command behavior. Define them as plain objects.

```ts
// Boolean option (flag - no value)
defineCommand({
  name: "build",
  options: {
    verbose: { type: "boolean", short: "v", description: "Verbose output" },
  },
  action({ options }) {
    // options.verbose is boolean (defaults to false)
  },
});

// Option with string value
defineCommand({
  name: "build",
  options: {
    output: { type: "string", short: "o", description: "Output directory" },
  },
  action({ options }) {
    // options.output is string | undefined
  },
});

// Option with default (type is inferred as always present)
defineCommand({
  name: "serve",
  options: {
    port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
  },
  action({ options }) {
    // options.port is number
  },
});

// Environment variable fallback
defineCommand({
  name: "deploy",
  options: {
    token: { type: "string", required: true, env: "API_TOKEN", description: "API token" },
  },
  action({ options }) {
    // options.token is string
  },
});
```

### Boolean vs Value Options

| Kind      | Usage             | Example           |
| --------- | ----------------- | ----------------- |
| `boolean` | No value (toggle) | `--verbose`, `-v` |
| `string`  | Takes a string    | `--output dist`   |
| `number`  | Takes a number    | `--port 8080`     |

## Subcommands

```ts
const watch = defineCommand({
  name: "watch",
  description: "Watch mode",
  action() {
    console.log("Watching...");
  },
});

const build = defineCommand({
  name: "build",
  description: "Build project",
  subcommands: { watch },
  action() {
    console.log("Building...");
  },
});

defineCli({
  name: "my-app",
  commands: { build },
}).run();
```

```bash
$ my-app build        # runs build action
$ my-app build watch  # runs watch action
```

## Middleware

Use `before` and `after` hooks for middleware, and `onError` for error handling:

```ts
const loggingMiddleware = async (ctx, next) => {
  console.log(`Running: ${ctx.command.name}`);
  await next();
  console.log("Done!");
};

defineCli({
  name: "my-app",
  commands: { build },
  middleware: [loggingMiddleware],
  onError(error, ctx) {
    console.error(`Error in ${ctx.command.name}: ${error.message}`);
  },
});

// Or per-command:
defineCommand({
  name: "build",
  before: [loggingMiddleware],
  after: [cleanupMiddleware],
  onError(error, ctx) {
    // Command-specific error handling
  },
  action() {
    // ...
  },
});
```

## Interactive Prompts

Define prompts in your command schema for full type inference:

```ts
const init = defineCommand({
  name: "init",
  description: "Initialize a new project",
  prompts: {
    name: { kind: "text", message: "Project name:", default: "my-project" },
    useTS: { kind: "confirm", message: "Use TypeScript?", default: true },
    framework: {
      kind: "select",
      message: "Select framework:",
      options: [
        { label: "React", value: "react" },
        { label: "Vue", value: "vue" },
        { label: "Svelte", value: "svelte" },
      ] as const, // Use 'as const' for literal type inference
    },
  },
  async action({ prompts }) {
    // Prompts are executed explicitly via .run()
    const name = await prompts.name.run();           // string
    const useTS = await prompts.useTS.run();         // boolean
    const framework = await prompts.framework.run(); // "react" | "vue" | "svelte"

    console.log(`Creating ${name} with ${framework}...`);
  },
});
```

**Prompt types:** `text`, `password`, `number`, `confirm`, `select`, `multiselect`, `autocomplete`, `filepath`

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
