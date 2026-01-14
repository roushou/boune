---
title: Middleware
description: Add pre and post processing to command execution.
---

Middleware allows you to run code before and after command execution, enabling cross-cutting concerns like logging, authentication, and timing.

## Basic Middleware

Middleware functions receive a context and a `next` function:

```typescript
import { defineCli, defineCommand } from "boune";
import type { MiddlewareHandler } from "boune";

const loggingMiddleware: MiddlewareHandler = async (ctx, next) => {
  console.log(`Starting command: ${ctx.command.name}`);
  await next();
  console.log(`Finished command: ${ctx.command.name}`);
};

const cli = defineCli({
  name: "myapp",
  version: "1.0.0",
  commands: {
    /* ... */
  },
  middleware: [loggingMiddleware],
});
```

## Middleware Context

The middleware context provides access to:

```typescript
interface MiddlewareContext {
  /** Parsed positional arguments */
  args: Record<string, unknown>;
  /** Parsed options/flags */
  options: Record<string, unknown>;
  /** Raw argv array */
  rawArgs: string[];
  /** The command being executed */
  command: CommandConfig;
}
```

## Common Patterns

### Timing

Measure command execution time:

```typescript
const timingMiddleware: MiddlewareHandler = async (ctx, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  console.log(`Command took ${duration.toFixed(2)}ms`);
};
```

### Verbose Logging

Conditionally log based on options:

```typescript
const verboseMiddleware: MiddlewareHandler = async (ctx, next) => {
  if (ctx.options.verbose) {
    console.log("Args:", ctx.args);
    console.log("Options:", ctx.options);
  }
  await next();
};
```

### Authentication

Check for required credentials:

```typescript
const authMiddleware: MiddlewareHandler = async (ctx, next) => {
  const token = process.env.API_TOKEN || ctx.options.token;

  if (!token) {
    console.error("Error: API token required");
    console.error("Set API_TOKEN env var or use --token flag");
    process.exit(1);
  }

  await next();
};
```

### Feature Flags

Enable features based on environment:

```typescript
const featureFlagMiddleware: MiddlewareHandler = async (ctx, next) => {
  if (process.env.EXPERIMENTAL === "true") {
    console.log("Experimental features enabled");
  }
  await next();
};
```

## Middleware Chain

Multiple middleware functions execute in order:

```typescript
const cli = defineCli({
  name: "myapp",
  version: "1.0.0",
  commands: { deploy },
  middleware: [
    authMiddleware, // Runs first
    loggingMiddleware, // Runs second
    timingMiddleware, // Runs third
  ],
});
```

The execution flow:

1. `authMiddleware` starts
2. `loggingMiddleware` starts
3. `timingMiddleware` starts
4. **Command action executes**
5. `timingMiddleware` completes
6. `loggingMiddleware` completes
7. `authMiddleware` completes

## Short-Circuiting

Stop the chain by not calling `next()`:

```typescript
const dryRunMiddleware: MiddlewareHandler = async (ctx, next) => {
  if (ctx.options.dryRun) {
    console.log("Dry run mode - command would execute with:");
    console.log("  Args:", ctx.args);
    console.log("  Options:", ctx.options);
    return; // Don't call next(), skip command
  }
  await next();
};
```

## Error Handling

Catch errors in middleware:

```typescript
const errorMiddleware: MiddlewareHandler = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`Error in ${ctx.command.name}:`, error.message);
    process.exit(1);
  }
};
```

### Global Error Handler

Use `onError` for centralized error handling:

```typescript
const cli = defineCli({
  name: "myapp",
  version: "1.0.0",
  commands: {
    /* ... */
  },
  onError: (error, ctx) => {
    console.error(`Command '${ctx.command.name}' failed: ${error.message}`);

    if (ctx.options.verbose) {
      console.error(error.stack);
    }

    process.exit(1);
  },
});
```

## Real-World Example

Complete CLI with middleware:

```typescript
import { defineCli, defineCommand } from "boune";
import type { MiddlewareHandler } from "boune";

// Middleware
const timing: MiddlewareHandler = async (ctx, next) => {
  const start = performance.now();
  await next();
  if (ctx.options.verbose) {
    console.log(`\nCompleted in ${(performance.now() - start).toFixed(0)}ms`);
  }
};

const auth: MiddlewareHandler = async (ctx, next) => {
  // Skip auth for help command
  if (ctx.command.name === "help") {
    return next();
  }

  const token = process.env.API_TOKEN;
  if (!token) {
    throw new Error("API_TOKEN environment variable required");
  }

  await next();
};

// Commands
const deploy = defineCommand({
  name: "deploy",
  description: "Deploy the application",
  options: {
    env: { type: "string", required: true, description: "Target environment" },
  },
  async action({ options }) {
    console.log(`Deploying to ${options.env}...`);
    await performDeploy(options.env);
    console.log("Deploy complete!");
  },
});

// CLI
const cli = defineCli({
  name: "myapp",
  version: "1.0.0",
  globalOptions: {
    verbose: { type: "boolean", short: "v", description: "Verbose output" },
  },
  commands: { deploy },
  middleware: [timing, auth],
  onError: (error, ctx) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  },
});

cli.run();
```

## Next Steps

- [Testing](/docs/testing) - Test your CLI
- [Validation](/docs/validation) - Validate user input
