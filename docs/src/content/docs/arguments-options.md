---
title: Arguments & Options
description: Define type-safe positional arguments and command options.
---

Boune provides a declarative API for defining arguments and options with full type inference.

## Arguments

Arguments are positional values passed to your command. Define them as plain objects with a `type` property.

### String Arguments

```typescript
import { defineCommand } from "boune";

const greet = defineCommand({
  name: "greet",
  arguments: {
    name: { type: "string", required: true, description: "Name to greet" },
  },
  action({ args }) {
    console.log(`Hello, ${args.name}!`); // args.name is string
  },
});
```

```bash
myapp greet Alice
```

### Number Arguments

```typescript
const add = defineCommand({
  name: "add",
  arguments: {
    a: { type: "number", required: true },
    b: { type: "number", required: true },
  },
  action({ args }) {
    console.log(args.a + args.b); // Both are numbers
  },
});
```

### Optional Arguments with Defaults

```typescript
const greet = defineCommand({
  name: "greet",
  arguments: {
    name: { type: "string", default: "World" },
  },
  action({ args }) {
    console.log(`Hello, ${args.name}!`);
  },
});
```

```bash
myapp greet        # Hello, World!
myapp greet Alice  # Hello, Alice!
```

### Variadic Arguments

Accept multiple values:

```typescript
const cat = defineCommand({
  name: "cat",
  arguments: {
    files: { type: "string", required: true, variadic: true, description: "Files to read" },
  },
  action({ args }) {
    for (const file of args.files) { // string[]
      console.log(Bun.file(file).text());
    }
  },
});
```

```bash
myapp cat file1.txt file2.txt file3.txt
```

## Options

Options are named flags that modify command behavior.

### Boolean Options

```typescript
import { defineCommand } from "boune";

const build = defineCommand({
  name: "build",
  options: {
    verbose: { type: "boolean", short: "v", description: "Verbose output" },
    minify: { type: "boolean", short: "m", description: "Minify output" },
  },
  action({ options }) {
    if (options.verbose) console.log("Verbose mode");
    if (options.minify) console.log("Minifying...");
  },
});
```

```bash
myapp build --verbose --minify
myapp build -v -m
```

### String Options

```typescript
const build = defineCommand({
  name: "build",
  options: {
    output: { type: "string", short: "o", default: "dist", description: "Output dir" },
  },
  action({ options }) {
    console.log(`Output: ${options.output}`);
  },
});
```

```bash
myapp build --output=build
myapp build -o build
```

### Number Options

```typescript
const serve = defineCommand({
  name: "serve",
  options: {
    port: { type: "number", short: "p", default: 3000, description: "Port number" },
  },
  action({ options }) {
    console.log(`Listening on port ${options.port}`);
  },
});
```

### Environment Variable Fallback

Read from environment variables:

```typescript
const deploy = defineCommand({
  name: "deploy",
  options: {
    token: { type: "string", env: "DEPLOY_TOKEN", description: "API token" },
  },
  action({ options }) {
    // Uses --token flag, or DEPLOY_TOKEN env var
    console.log(`Token: ${options.token}`);
  },
});
```

```bash
DEPLOY_TOKEN=secret myapp deploy
myapp deploy --token=secret
```

### Required Options

```typescript
const deploy = defineCommand({
  name: "deploy",
  options: {
    env: { type: "string", required: true, description: "Target environment" },
  },
  action({ options }) {
    console.log(`Deploying to ${options.env}`);
  },
});
```

### Long Option Names

By default, the option name becomes the long flag. Customize it:

```typescript
const build = defineCommand({
  name: "build",
  options: {
    dryRun: { type: "boolean", long: "dry-run", description: "Simulate build" },
  },
  action({ options }) {
    if (options.dryRun) console.log("Dry run mode");
  },
});
```

```bash
myapp build --dry-run
```

## Global Options

Define options available to all commands:

```typescript
const cli = defineCli({
  name: "myapp",
  globalOptions: {
    verbose: { type: "boolean", short: "v", description: "Verbose output" },
    config: { type: "string", short: "c", description: "Config file path" },
  },
  commands: { build, serve },
});
```

```bash
myapp build --verbose
myapp serve --config=prod.json
```

## Argument Properties

| Property      | Type      | Description              |
| ------------- | --------- | ------------------------ |
| `type`        | `string`  | `"string"` or `"number"` |
| `required`    | `boolean` | Mark as required         |
| `default`     | `T`       | Default value            |
| `variadic`    | `boolean` | Accept multiple values   |
| `description` | `string`  | Help text                |
| `validate`    | `object`  | Validation rules         |

## Option Properties

| Property      | Type      | Description                            |
| ------------- | --------- | -------------------------------------- |
| `type`        | `string`  | `"string"`, `"number"`, or `"boolean"` |
| `short`       | `string`  | Short flag (-x)                        |
| `long`        | `string`  | Long flag (--name)                     |
| `default`     | `T`       | Default value                          |
| `required`    | `boolean` | Mark as required                       |
| `env`         | `string`  | Env var fallback                       |
| `description` | `string`  | Help text                              |
| `validate`    | `object`  | Validation rules                       |

## Next Steps

- [Validation](/docs/validation) - Validate user input
- [Prompts](/docs/prompts) - Interactive input
