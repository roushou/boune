#!/usr/bin/env bun

import { color, createSpinner, defineCli, defineCommand } from "boune";
import { generateProject } from "./generator.ts";

const newCommand = defineCommand({
  name: "new",
  description: "Create a new CLI project",
  arguments: {
    name: { type: "string", description: "Project name" },
  },
  options: {
    template: { type: "string", short: "t", description: "Template to use (minimal, full)" },
    noInstall: { type: "boolean", long: "no-install", description: "Skip installing dependencies" },
    noGit: { type: "boolean", long: "no-git", description: "Skip git initialization" },
  },
  prompts: {
    name: {
      kind: "text",
      message: "Project name:",
      default: "my-cli",
      validator: { minLength: 1 },
    },
    template: {
      kind: "select",
      message: "Select a template:",
      options: [
        { label: "Minimal", value: "minimal", hint: "Basic CLI with one command" },
        { label: "Full", value: "full", hint: "Multiple commands, prompts, and hooks" },
      ] as const,
      default: "minimal",
    },
    proceed: {
      kind: "confirm",
      message: "Create project?",
      default: true,
    },
  },
  async action({ args, options, prompts }) {
    console.log();
    console.log(color.bold("  Create a new CLI with boune"));
    console.log();

    // Use args/options if provided, otherwise prompt
    const projectName = args.name || (await prompts.name.run());
    const template = (options.template as "minimal" | "full") || (await prompts.template.run());

    // Show summary
    console.log();
    console.log(color.dim("  Project: ") + color.cyan(projectName));
    console.log(color.dim("  Template: ") + color.cyan(template));
    console.log();

    // Confirm
    const proceed = await prompts.proceed.run();
    if (!proceed) {
      console.log(color.dim("\n  Cancelled.\n"));
      return;
    }

    // Generate project
    console.log();
    const spinner = createSpinner("Creating project...").start();

    try {
      await generateProject({
        name: projectName,
        template,
        skipInstall: options.noInstall ?? false,
        skipGit: options.noGit ?? false,
      });

      spinner.succeed("Project created!");

      // Next steps
      console.log();
      console.log(color.bold("  Next steps:"));
      console.log();
      console.log(`  ${color.cyan("cd")} ${projectName}`);
      if (options.noInstall) {
        console.log(`  ${color.cyan("bun install")}`);
      }
      console.log(`  ${color.cyan("bun run dev")}`);
      console.log();
    } catch (err) {
      spinner.fail(`Failed: ${err}`);
      process.exit(1);
    }
  },
});

const cli = defineCli({
  name: "create-boune",
  version: "0.5.0",
  description: "Scaffold a new CLI project with boune",
  commands: { new: newCommand },
});

// Support `bun create boune [name]` without explicit "new" command
const argv = process.argv.slice(2);
const firstArg = argv[0];
const isGlobalFlag =
  firstArg === "--help" || firstArg === "-h" || firstArg === "--version" || firstArg === "-V";
const isNewCommand = firstArg === "new";

if (!firstArg || (!isGlobalFlag && !isNewCommand)) {
  cli.run(["new", ...argv]);
} else {
  cli.run(argv);
}
