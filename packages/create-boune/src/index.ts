#!/usr/bin/env bun

import { argument, color, createSpinner, defineCli, defineCommand, option } from "boune";
import { confirm, select, text } from "boune/prompt";
import { generateProject } from "./generator.ts";

const newCommand = defineCommand({
  name: "new",
  description: "Create a new CLI project",
  arguments: {
    name: argument.string().describe("Project name"),
  },
  options: {
    template: option.string().short("t").describe("Template to use (minimal, full)"),
    noInstall: option.boolean().long("no-install").describe("Skip installing dependencies"),
    noGit: option.boolean().long("no-git").describe("Skip git initialization"),
  },
  async action({ args, options }) {
    let projectName = args.name;
    let template = options.template;
    const skipInstall = options.noInstall ?? false;
    const skipGit = options.noGit ?? false;

    console.log();
    console.log(color.bold("  Create a new CLI with boune"));
    console.log();

    // Project name
    if (!projectName) {
      projectName = await text({
        message: "Project name:",
        default: "my-cli",
        validate: (v) => {
          if (!v) return "Project name is required";
          if (!/^[a-z0-9-]+$/.test(v)) return "Use lowercase letters, numbers, and hyphens only";
          return true;
        },
      });
    }

    // Template
    if (!template) {
      template = await select({
        message: "Select a template:",
        options: [
          { label: "Minimal", value: "minimal", hint: "Basic CLI with one command" },
          { label: "Full", value: "full", hint: "Multiple commands, prompts, and hooks" },
        ],
        default: "minimal",
      });
    }

    // Confirmation
    console.log();
    console.log(color.dim("  Project: ") + color.cyan(projectName));
    console.log(color.dim("  Template: ") + color.cyan(template));
    console.log();

    const proceed = await confirm({
      message: "Create project?",
      default: true,
    });

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
        template: template as "minimal" | "full",
        skipInstall,
        skipGit,
      });

      spinner.succeed("Project created!");

      // Next steps
      console.log();
      console.log(color.bold("  Next steps:"));
      console.log();
      console.log(`  ${color.cyan("cd")} ${projectName}`);
      if (skipInstall) {
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
})

cli.run();
