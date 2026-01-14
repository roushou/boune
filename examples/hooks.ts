#!/usr/bin/env bun

import { color, defineCli, defineCommand } from "../packages/boune/src/index.ts";
import type { MiddlewareHandler } from "../packages/boune/src/types";

// Timing middleware - wraps around command execution
const timingMiddleware: MiddlewareHandler = async (ctx, next) => {
  const startTime = performance.now();
  console.log(color.dim(`[pre] Running command: ${ctx.command.name}`));

  await next();

  const duration = (performance.now() - startTime).toFixed(2);
  console.log(color.dim(`[post] Command ${ctx.command.name} completed in ${duration}ms`));
};

// Command with its own middleware
const deploy = defineCommand({
  name: "deploy",
  description: "Deploy the application",
  arguments: {
    env: { type: "string", required: true, description: "Environment (staging, production)" },
  },
  options: {
    force: { type: "boolean", short: "f", description: "Skip confirmation" },
    dryRun: { type: "boolean", long: "dry-run", description: "Show what would be deployed" },
  },
  before: [
    async (ctx, next) => {
      if (ctx.args.env === "production") {
        console.log(color.yellow("⚠️  Deploying to PRODUCTION"));
      }
      await next();
    },
  ],
  after: [
    async () => {
      console.log(color.green("✓ Deployment hooks completed"));
    },
  ],
  async action({ args, options }) {
    if (options.dryRun) {
      console.log(color.cyan(`[DRY RUN] Would deploy to ${args.env}`));
      return;
    }

    console.log(`Deploying to ${color.bold(args.env)}...`);

    // Simulate deployment steps
    const steps = ["Building assets", "Running tests", "Uploading files", "Restarting services"];

    for (const step of steps) {
      console.log(`  ${color.cyan("→")} ${step}...`);
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(color.green(`\n✓ Deployed to ${args.env}`));
  },
});

// Command that throws an error
const fail = defineCommand({
  name: "fail",
  description: "Command that fails (for testing error handling)",
  action() {
    throw new Error("Intentional failure for demo");
  },
  onError(error) {
    console.log(color.dim(`[error] Caught error: ${error.message}`));
  },
});

// Simple command to show middleware
const hello = defineCommand({
  name: "hello",
  description: "Simple hello command",
  arguments: {
    name: { type: "string", default: "World", description: "Name to greet" },
  },
  action({ args }) {
    console.log(`Hello, ${args.name}!`);
  },
});

void defineCli({
  name: "hooks-demo",
  version: "1.0.0",
  description: "Demonstrating CLI middleware",
  middleware: [timingMiddleware],
  commands: {
    deploy,
    fail,
    hello,
  },
}).run();
