---
title: Commands
description: Learn how to define commands, subcommands, and aliases in Boune.
---

Commands are the building blocks of your CLI. Each command can have its own arguments, options, and action handler.

## Defining Commands

Use `defineCommand` to create a command:

```typescript
import { defineCommand } from "boune";

const build = defineCommand({
  name: "build",
  description: "Build the project",
  action() {
    console.log("Building...");
  },
});
```

## Command Properties

| Property      | Type       | Description             |
| ------------- | ---------- | ----------------------- |
| `name`        | `string`   | Command name (required) |
| `description` | `string`   | Help text description   |
| `aliases`     | `string[]` | Alternative names       |
| `arguments`   | `object`   | Positional arguments    |
| `options`     | `object`   | Command options/flags   |
| `prompts`     | `object`   | Interactive prompts     |
| `action`      | `function` | Handler function        |
| `subcommands` | `object`   | Nested commands         |
| `hidden`      | `boolean`  | Hide from help          |
| `before`      | `array`    | Before middleware       |
| `after`       | `array`    | After middleware        |
| `onError`     | `function` | Error handler           |

## Registering Commands

Register commands when creating your CLI:

```typescript
import { defineCli, defineCommand } from "boune";

const build = defineCommand({
  name: "build",
  action() {
    /* ... */
  },
});

const serve = defineCommand({
  name: "serve",
  action() {
    /* ... */
  },
});

const cli = defineCli({
  name: "myapp",
  version: "1.0.0",
  commands: { build, serve },
});

cli.run();
```

## Aliases

Give commands alternative names:

```typescript
const build = defineCommand({
  name: "build",
  aliases: ["b"],
  action() {
    console.log("Building...");
  },
});
```

```bash
myapp build   # Works
myapp b       # Also works
```

## Subcommands

Nest commands for complex CLIs:

```typescript
const remoteAdd = defineCommand({
  name: "add",
  description: "Add a remote",
  arguments: {
    name: { type: "string", required: true },
    url: { type: "string", required: true },
  },
  action({ args }) {
    console.log(`Added remote ${args.name} -> ${args.url}`);
  },
});

const remoteRemove = defineCommand({
  name: "remove",
  aliases: ["rm"],
  arguments: {
    name: { type: "string", required: true },
  },
  action({ args }) {
    console.log(`Removed remote ${args.name}`);
  },
});

const remote = defineCommand({
  name: "remote",
  description: "Manage remotes",
  subcommands: {
    add: remoteAdd,
    remove: remoteRemove,
    rm: remoteRemove, // Alias
  },
  action() {
    // Default action when no subcommand given
    console.log("origin");
  },
});
```

```bash
myapp remote           # Lists remotes
myapp remote add origin https://...
myapp remote rm origin
```

## Async Actions

Actions can be async:

```typescript
const deploy = defineCommand({
  name: "deploy",
  async action() {
    console.log("Deploying...");
    await deployToServer();
    console.log("Done!");
  },
});
```

## Context Object

The action receives a context with parsed args, options, and prompts:

```typescript
const greet = defineCommand({
  name: "greet",
  arguments: {
    name: { type: "string", required: true },
  },
  options: {
    loud: { type: "boolean" },
  },
  prompts: {
    confirm: { kind: "confirm", message: "Are you sure?" },
  },
  async action(ctx) {
    // ctx.args.name - typed as string
    // ctx.options.loud - typed as boolean
    // ctx.prompts.confirm.run() - returns Promise<boolean>
    // ctx.rawArgs - original argv array
    console.log(`Hello, ${ctx.args.name}!`);
  },
});
```

## Hidden Commands

Hide commands from help output:

```typescript
const internal = defineCommand({
  name: "internal",
  hidden: true,
  action() {
    // Still callable, just not shown in help
  },
});
```

## Next Steps

- [Arguments & Options](/docs/arguments-options) - Define typed inputs
- [Middleware](/docs/middleware) - Add pre/post hooks
