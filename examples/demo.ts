#!/usr/bin/env bun

/**
 * Demo CLI showcasing boune features
 */
import {
  cli,
  command,
  color,
  createSpinner,
  createProgressBar,
  v,
  type ShellType,
} from "../packages/boune/src/index.ts";
import { text, confirm, select } from "../packages/boune/src/prompt/index.ts";

// Greet command with argument and options
const greet = command("greet")
  .description("Greet someone")
  .argument("<name>", "Name to greet")
  .option("-l, --loud", "Shout the greeting")
  .option("-t, --times <number>", "Number of times to greet", { type: "number", default: 1 })
  .action(({ args, options }) => {
    for (let i = 0; i < options.times; i++) {
      const msg = `Hello, ${args.name}!`;
      console.log(options.loud ? msg.toUpperCase() : msg);
    }
  });

// Build command with subcommands
const buildWatch = command("watch")
  .description("Watch for changes and rebuild")
  .option("-p, --poll", "Use polling instead of native watchers")
  .action(({ options }) => {
    console.log(color.cyan("Watching for changes..."));
    console.log(`Polling: ${options.poll ? "yes" : "no"}`);
  });

const build = command("build")
  .description("Build the project")
  .alias("b")
  .argument("<entry>", "Entry file")
  .option("-o, --output <dir>", "Output directory", { default: "dist" })
  .option("-m, --minify", "Minify output")
  .subcommand(buildWatch)
  .action(({ args, options }) => {
    console.log(color.bold("Building project..."));
    console.log(`  Entry: ${args.entry}`);
    console.log(`  Output: ${options.output}`);
    console.log(`  Minify: ${options.minify ? "yes" : "no"}`);
  });

// Init command with interactive prompts
const init = command("init")
  .description("Initialize a new project")
  .action(async () => {
    console.log(color.bold("\nProject Setup\n"));

    const name = await text({
      message: "Project name:",
      default: "my-project",
    });

    const template = await select({
      message: "Select a template:",
      options: [
        { label: "Minimal", value: "minimal", hint: "Basic setup" },
        { label: "Full", value: "full", hint: "With tests and linting" },
        { label: "Library", value: "lib", hint: "For publishing to npm" },
      ],
      default: "minimal",
    });

    const useTypeScript = await confirm({
      message: "Use TypeScript?",
      default: true,
    });

    console.log(color.bold("\nCreating project..."));
    const spinner = createSpinner("Setting up files").start();

    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 1000));

    spinner.succeed("Project created!");
    console.log(`\n  ${color.green("→")} cd ${name}`);
    console.log(`  ${color.green("→")} bun install`);
    console.log(`  ${color.green("→")} bun run dev\n`);
  });

// Serve command with validation
const serve = command("serve")
  .description("Start a development server")
  .option("-p, --port <port>", "Port to listen on", {
    type: "number",
    default: 3000,
    validate: v.number().integer().min(1).max(65535),
  })
  .option("-H, --host <host>", "Host to bind to", {
    type: "string",
    default: "localhost",
    validate: v.string().oneOf(["localhost", "0.0.0.0", "127.0.0.1"]),
  })
  .option("-e, --env <env>", "Environment", {
    type: "string",
    default: "development",
    validate: v.string().oneOf(["development", "staging", "production"]),
  })
  .action(({ options }) => {
    console.log(color.bold("\nStarting server...\n"));
    console.log(`  Host: ${options.host}`);
    console.log(`  Port: ${options.port}`);
    console.log(`  Env:  ${options.env}`);
    console.log(color.green(`\n  Server running at http://${options.host}:${options.port}\n`));
  });

// Download command with progress bar
const download = command("download")
  .description("Simulate downloading files")
  .argument("<count>", "Number of files to download", { type: "number" })
  .action(async ({ args }) => {
    console.log(color.bold(`\nDownloading ${args.count} files...\n`));

    const progress = createProgressBar("Downloading files", { total: args.count });

    for (let i = 1; i <= args.count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      progress.update(i, `Downloading file ${i}/${args.count}`);
    }

    progress.complete(`Downloaded ${args.count} files`);
  });

// Completions command to generate shell completion scripts
const completions = command("completions")
  .description("Generate shell completion scripts")
  .argument("<shell>", "Shell type (bash, zsh, fish)")
  .action(({ args }) => {
    if (!["bash", "zsh", "fish"].includes(args.shell)) {
      console.error(color.red(`Error: Invalid shell "${args.shell}". Use bash, zsh, or fish.`));
      process.exit(1);
    }
    // Generate and output completion script
    const script = app.completions(args.shell as ShellType);
    console.log(script);
  });

// Create the CLI
const app = cli("demo")
  .version("1.0.0")
  .description("A demo CLI built with boune")
  .command(greet)
  .command(build)
  .command(init)
  .command(serve)
  .command(download)
  .command(completions);

app.run();
