#!/usr/bin/env bun

/**
 * Example demonstrating hooks and middleware patterns
 */
import { cli, command, color } from "../packages/boune/src/index.ts";

// Timing middleware
let startTime: number;

const timedCli = cli("hooks-demo")
  .version("1.0.0")
  .description("Demonstrating CLI hooks")
  .hook("preAction", ({ command }) => {
    startTime = performance.now();
    console.log(color.dim(`[pre] Running command: ${command.name}`));
  })
  .hook("postAction", ({ command }) => {
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(color.dim(`[post] Command ${command.name} completed in ${duration}ms`));
  })
  .hook("preError", ({ error }) => {
    console.log(color.dim(`[error] Caught error: ${error?.message}`));
  });

// Command with its own hooks
const deploy = command("deploy")
  .description("Deploy the application")
  .argument("<env>", "Environment (staging, production)")
  .option("-f, --force", "Skip confirmation")
  .option("--dry-run", "Show what would be deployed")
  .hook("preAction", ({ args }) => {
    if (args.env === "production") {
      console.log(color.yellow("⚠️  Deploying to PRODUCTION"));
    }
  })
  .hook("postAction", () => {
    console.log(color.green("✓ Deployment hooks completed"));
  })
  .action(async ({ args, options }) => {
    if (options["dry-run"]) {
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
  });

// Command that throws an error
const fail = command("fail")
  .description("Command that fails (for testing error hooks)")
  .action(() => {
    throw new Error("Intentional failure for demo");
  });

// Simple command to show hooks
const hello = command("hello")
  .description("Simple hello command")
  .argument("[name]", "Name to greet", { default: "World" })
  .action(({ args }) => {
    console.log(`Hello, ${args.name}!`);
  });

timedCli.command(deploy).command(fail).command(hello).run();
