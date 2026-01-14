---
title: Testing
description: Test your CLI applications with the built-in testing utilities.
---

Boune provides testing utilities to help you write reliable tests for your CLI commands.

## Setup

Import the test utilities:

```typescript
import { testCli } from "boune/testing";
import { expect, test, describe } from "bun:test";
```

## Basic Testing

Use `testCli` to run commands and capture output:

```typescript
import { defineCli, defineCommand } from "boune";
import { testCli } from "boune/testing";
import { expect, test } from "bun:test";

const greet = defineCommand({
  name: "greet",
  action() {
    console.log("Hello, World!");
  },
});

const cli = defineCli({
  name: "myapp",
  version: "1.0.0",
  commands: { greet },
});

test("greet command outputs hello", async () => {
  const result = await testCli(cli).run(["greet"]);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain("Hello, World!");
});
```

## Test Result

The test runner returns a `TestResult` object:

```typescript
interface TestResult {
  /** Exit code (0 = success) */
  code: number;
  /** Captured stdout output */
  stdout: string;
  /** Captured stderr output */
  stderr: string;
  /** Error if command threw */
  error?: Error;
}
```

## Testing Arguments

Test commands with positional arguments:

```typescript
const echo = defineCommand({
  name: "echo",
  arguments: {
    message: { type: "string", required: true },
  },
  action({ args }) {
    console.log(args.message);
  },
});

test("echo command repeats message", async () => {
  const result = await testCli(cli).run(["echo", "test message"]);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain("test message");
});
```

## Testing Options

Test commands with flags and options:

```typescript
const build = defineCommand({
  name: "build",
  options: {
    minify: { type: "boolean", short: "m" },
    output: { type: "string", short: "o", default: "dist" },
  },
  action({ options }) {
    console.log(`Building to ${options.output}`);
    if (options.minify) {
      console.log("Minification enabled");
    }
  },
});

test("build with options", async () => {
  const result = await testCli(cli).run(["build", "--output", "out", "--minify"]);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain("Building to out");
  expect(result.stdout).toContain("Minification enabled");
});

test("build with short flags", async () => {
  const result = await testCli(cli).run(["build", "-o", "out", "-m"]);

  expect(result.code).toBe(0);
});
```

## Environment Variables

Inject environment variables for testing:

```typescript
const deploy = defineCommand({
  name: "deploy",
  options: {
    token: { type: "string", env: "API_TOKEN" },
  },
  action({ options }) {
    console.log(`Token: ${options.token}`);
  },
});

test("reads token from environment", async () => {
  const result = await testCli(cli).env({ API_TOKEN: "secret123" }).run(["deploy"]);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain("Token: secret123");
});
```

## Testing Errors

Test error cases and exit codes:

```typescript
test("fails on missing required argument", async () => {
  const result = await testCli(cli).run(["greet"]);

  expect(result.code).toBe(1);
  expect(result.stderr).toContain("Missing required argument");
});

test("fails on unknown command", async () => {
  const result = await testCli(cli).run(["unknown"]);

  expect(result.code).toBe(1);
  expect(result.stderr).toContain("Unknown command");
});
```

## Timeouts

Set execution timeout for slow commands:

```typescript
test("times out slow commands", async () => {
  const result = await testCli(cli)
    .timeout(100) // 100ms timeout
    .run(["slow-command"]);

  expect(result.error?.message).toContain("timed out");
});

test("slow command completes within timeout", async () => {
  const result = await testCli(cli)
    .timeout(5000) // 5 second timeout
    .run(["slow-command"]);

  expect(result.code).toBe(0);
});
```

## Chaining Methods

Chain configuration methods fluently:

```typescript
test("complex test setup", async () => {
  const result = await testCli(cli)
    .env({ DEBUG: "true", API_KEY: "test" })
    .timeout(10000)
    .run(["deploy", "--env", "staging"]);

  expect(result.code).toBe(0);
});
```

## Testing Subcommands

Test nested commands:

```typescript
test("remote add subcommand", async () => {
  const result = await testCli(cli).run([
    "remote",
    "add",
    "origin",
    "https://github.com/user/repo",
  ]);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain("Added remote origin");
});
```

## Test Organization

Organize tests with describe blocks:

```typescript
import { describe, test, expect } from "bun:test";
import { testCli } from "boune/testing";

describe("build command", () => {
  test("builds with defaults", async () => {
    const result = await testCli(cli).run(["build"]);
    expect(result.code).toBe(0);
  });

  test("builds with minification", async () => {
    const result = await testCli(cli).run(["build", "--minify"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Minifying");
  });

  test("builds to custom output", async () => {
    const result = await testCli(cli).run(["build", "-o", "custom"]);
    expect(result.stdout).toContain("custom");
  });
});

describe("deploy command", () => {
  test("requires authentication", async () => {
    const result = await testCli(cli).run(["deploy"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("API_TOKEN required");
  });

  test("deploys with token", async () => {
    const result = await testCli(cli).env({ API_TOKEN: "valid" }).run(["deploy"]);
    expect(result.code).toBe(0);
  });
});
```

## Complete Example

```typescript
import { defineCli, defineCommand } from "boune";
import { testCli } from "boune/testing";
import { describe, test, expect, beforeAll } from "bun:test";

// CLI setup
const greet = defineCommand({
  name: "greet",
  arguments: {
    name: { type: "string", required: true },
  },
  options: {
    loud: { type: "boolean", short: "l" },
  },
  action({ args, options }) {
    const message = `Hello, ${args.name}!`;
    console.log(options.loud ? message.toUpperCase() : message);
  },
});

const cli = defineCli({
  name: "test-cli",
  version: "1.0.0",
  commands: { greet },
});

// Tests
describe("greet command", () => {
  test("greets with name", async () => {
    const result = await testCli(cli).run(["greet", "Alice"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Hello, Alice!");
  });

  test("greets loudly with --loud flag", async () => {
    const result = await testCli(cli).run(["greet", "Bob", "--loud"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("HELLO, BOB!");
  });

  test("greets loudly with -l short flag", async () => {
    const result = await testCli(cli).run(["greet", "Charlie", "-l"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("HELLO, CHARLIE!");
  });

  test("fails without name argument", async () => {
    const result = await testCli(cli).run(["greet"]);

    expect(result.code).toBe(1);
  });
});
```

## Running Tests

Run your tests with Bun:

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/cli.test.ts

# Run with watch mode
bun test --watch
```

## Next Steps

- [Commands](/docs/commands) - Define more commands
- [Validation](/docs/validation) - Validate user input
- [Utilities](/docs/utilities) - Logger, update checker, and more
