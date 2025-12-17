#!/usr/bin/env bun

/**
 * Demo CLI showcasing boune features
 */
import {
  color,
  createProgressBar,
  createSpinner,
  defineCli,
  defineCommand,
} from "../packages/boune/src/index.ts";

// Greet command with argument and options
const greet = defineCommand({
  name: "greet",
  description: "Greet someone",
  arguments: {
    name: { type: "string", required: true, description: "Name to greet" },
  },
  options: {
    loud: { type: "boolean", short: "l", description: "Shout the greeting" },
    times: { type: "number", short: "t", default: 1, description: "Number of times to greet" },
  },
  action({ args, options }) {
    for (let i = 0; i < options.times; i++) {
      const msg = `Hello, ${args.name}!`;
      console.log(options.loud ? msg.toUpperCase() : msg);
    }
  },
});

// Build command with subcommands
const buildWatch = defineCommand({
  name: "watch",
  description: "Watch for changes and rebuild",
  options: {
    poll: { type: "boolean", short: "p", description: "Use polling instead of native watchers" },
  },
  action({ options }) {
    console.log(color.cyan("Watching for changes..."));
    console.log(`Polling: ${options.poll ? "yes" : "no"}`);
  },
});

const build = defineCommand({
  name: "build",
  description: "Build the project",
  aliases: ["b"],
  arguments: {
    entry: { type: "string", required: true, description: "Entry file" },
  },
  options: {
    output: { type: "string", short: "o", default: "dist", description: "Output directory" },
    minify: { type: "boolean", short: "m", description: "Minify output" },
  },
  subcommands: {
    watch: buildWatch,
  },
  action({ args, options }) {
    console.log(color.bold("Building project..."));
    console.log(`  Entry: ${args.entry}`);
    console.log(`  Output: ${options.output}`);
    console.log(`  Minify: ${options.minify ? "yes" : "no"}`);
  },
});

// Init command with declarative prompts
const init = defineCommand({
  name: "init",
  description: "Initialize a new project",
  prompts: {
    name: { kind: "text", message: "Project name:", default: "my-project" },
    template: {
      kind: "select",
      message: "Select a template:",
      options: [
        { label: "Minimal", value: "minimal", hint: "Basic setup" },
        { label: "Full", value: "full", hint: "With tests and linting" },
        { label: "Library", value: "lib", hint: "For publishing to npm" },
      ] as const,
      default: "minimal",
    },
    useTypeScript: { kind: "confirm", message: "Use TypeScript?", default: true },
  },
  async action({ prompts }) {
    console.log(color.bold("\nProject Setup\n"));

    const name = await prompts.name.run();
    const template = await prompts.template.run();
    const useTypeScript = await prompts.useTypeScript.run();

    console.log(color.bold("\nCreating project..."));
    const spinner = createSpinner("Setting up files").start();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    spinner.succeed("Project created!");
    console.log(`\n  Template: ${template}, TypeScript: ${useTypeScript}`);
    console.log(`\n  ${color.green("→")} cd ${name}`);
    console.log(`  ${color.green("→")} bun install`);
    console.log(`  ${color.green("→")} bun run dev\n`);
  },
});

// Serve command with validation
const serve = defineCommand({
  name: "serve",
  description: "Start a development server",
  options: {
    port: {
      type: "number",
      short: "p",
      default: 3000,
      description: "Port to listen on",
      validate: { integer: true, min: 1, max: 65535 },
    },
    host: {
      type: "string",
      short: "H",
      default: "localhost",
      description: "Host to bind to",
      choices: ["localhost", "0.0.0.0", "127.0.0.1"] as const,
    },
    env: {
      type: "string",
      short: "e",
      default: "development",
      description: "Environment",
      choices: ["development", "staging", "production"] as const,
    },
  },
  action({ options }) {
    console.log(color.bold("\nStarting server...\n"));
    console.log(`  Host: ${options.host}`);
    console.log(`  Port: ${options.port}`);
    console.log(`  Env:  ${options.env}`);
    console.log(color.green(`\n  Server running at http://${options.host}:${options.port}\n`));
  },
});

// Download command with progress bar
const download = defineCommand({
  name: "download",
  description: "Simulate downloading files",
  arguments: {
    count: { type: "number", required: true, description: "Number of files to download" },
  },
  async action({ args }) {
    console.log(color.bold(`\nDownloading ${args.count} files...\n`));

    const progress = createProgressBar("Downloading files", { total: args.count });

    for (let i = 1; i <= args.count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      progress.update(i, `Downloading file ${i}/${args.count}`);
    }

    progress.complete(`Downloaded ${args.count} files`);
  },
});

// Completions command to generate shell completion scripts
const completions = defineCommand({
  name: "completions",
  description: "Generate shell completion scripts",
  arguments: {
    shell: {
      type: "string",
      required: true,
      description: "Shell type (bash, zsh, fish)",
      choices: ["bash", "zsh", "fish"] as const,
    },
  },
  action({ args }) {
    // args.shell is now typed as "bash" | "zsh" | "fish"
    const script = app.completions(args.shell);
    console.log(script);
  },
});

// Create the CLI
const app = defineCli({
  name: "demo",
  version: "1.0.0",
  description: "A demo CLI built with boune",
  commands: {
    greet,
    build,
    b: build,
    init,
    serve,
    download,
    completions,
  },
});

app.run();
