import { color, createSpinner, defineCommand } from "boune";
import { confirm, multiselect, select, text } from "boune/prompt";
import { join, resolve } from "node:path";
import type { BouneConfig } from "../config/index.ts";
import { existsSync } from "node:fs";

interface ProjectOptions {
  name: string;
  description: string;
  template: "minimal" | "full";
  features: string[];
  profiles: string[];
  initGit: boolean;
}

const TEMPLATES = {
  minimal: {
    label: "Minimal",
    description: "Basic CLI with a single command",
  },
  full: {
    label: "Full",
    description: "Feature-rich CLI with multiple commands, prompts, and config",
  },
} as const;

const FEATURES = [
  { label: "Interactive prompts", value: "prompts", hint: "text, select, confirm, etc." },
  { label: "Shell completions", value: "completions", hint: "bash, zsh, fish" },
  { label: "Configuration file", value: "config", hint: "boune.config.ts support" },
  { label: "Environment profiles", value: "profiles", hint: "dev, staging, prod" },
  { label: "Spinners & progress", value: "output", hint: "Loading indicators" },
] as const;

const DEFAULT_PROFILES = [
  { label: "Development", value: "dev" },
  { label: "Staging", value: "staging" },
  { label: "Production", value: "prod" },
] as const;

export const init = defineCommand({
  name: "init",
  description: "Initialize a new boune CLI project",
  arguments: {
    directory: {
      type: "string",
      required: false,
      description: "Directory to initialize (defaults to current directory)",
    },
  },
  options: {
    name: {
      type: "string",
      short: "n",
      description: "Project name",
    },
    template: {
      type: "string",
      short: "t",
      description: "Template to use (minimal, full)",
    },
    yes: {
      type: "boolean",
      short: "y",
      description: "Skip prompts and use defaults",
    },
  },
  async action({ args, options }) {
    const targetDir = resolve(args.directory || ".");
    const dirName = targetDir.split("/").pop() || "my-cli";

    console.log("");
    console.log(color.bold(color.cyan("  Boune CLI Initializer")));
    console.log(color.dim("  Create a new CLI project with boune\n"));

    // Check if directory already has a package.json
    const packageJsonPath = join(targetDir, "package.json");
    if (existsSync(packageJsonPath)) {
      const proceed =
        options.yes ||
        (await confirm({
          message: "package.json already exists. Continue and overwrite?",
          default: false,
        }));
      if (!proceed) {
        console.log(color.dim("\nAborted."));
        return;
      }
    }

    let projectOptions: ProjectOptions;

    if (options.yes) {
      // Use defaults
      projectOptions = {
        name: options.name || dirName,
        description: "A CLI built with boune",
        template: (options.template as "minimal" | "full") || "minimal",
        features: ["prompts", "completions"],
        profiles: [],
        initGit: true,
      };
    } else {
      // Interactive wizard
      projectOptions = await runWizard(dirName, options);
    }

    console.log("");

    try {
      // Generate project
      let spinner = createSpinner("Creating project structure...").start();
      await generateProject(targetDir, projectOptions);
      spinner.succeed("Project structure created");

      // Init git if requested
      if (projectOptions.initGit && !existsSync(join(targetDir, ".git"))) {
        spinner = createSpinner("Initializing git repository...").start();
        const result = Bun.spawnSync(["git", "init"], { cwd: targetDir });
        if (result.exitCode === 0) {
          spinner.succeed("Git repository initialized");
        } else {
          spinner.fail("Failed to initialize git");
        }
      }

      // Install dependencies
      spinner = createSpinner("Installing dependencies...").start();
      const installResult = Bun.spawnSync(["bun", "install"], { cwd: targetDir });
      if (installResult.exitCode === 0) {
        spinner.succeed("Dependencies installed");
      } else {
        spinner.fail("Failed to install dependencies");
      }

      console.log("");
      console.log(color.green("Project created successfully!"));
      console.log("");
      console.log(color.dim("  Next steps:"));
      console.log("");
      if (args.directory) {
        console.log(`    ${color.cyan("cd")} ${args.directory}`);
      }
      console.log(`    ${color.cyan("bun run dev")} ${color.dim("# Run your CLI")}`);
      console.log(`    ${color.cyan("bun run build")} ${color.dim("# Build for production")}`);
      console.log("");
    } catch (err) {
      console.log(color.red("Failed to create project"));
      if (err instanceof Error) {
        console.error(err.stack || err.message);
      } else {
        console.error(String(err));
      }
      process.exit(1);
    }
  },
});

async function runWizard(
  defaultName: string,
  options: { name?: string; template?: string },
): Promise<ProjectOptions> {
  // Project name
  const name =
    options.name ||
    (await text({
      message: "Project name:",
      placeholder: defaultName,
      default: defaultName,
    }));

  // Description
  const description = await text({
    message: "Description:",
    placeholder: "A CLI built with boune",
    default: "A CLI built with boune",
  });

  // Template
  const template =
    (options.template as "minimal" | "full") ||
    (await select({
      message: "Select a template:",
      options: Object.entries(TEMPLATES).map(([value, { label, description }]) => ({
        label,
        value: value as "minimal" | "full",
        hint: description,
      })),
    }));

  // Features (only for full template)
  let features: string[] = [];
  if (template === "full") {
    features = await multiselect({
      message: "Select features to include:",
      options: [...FEATURES],
    });
  }

  // Profiles (if profiles feature selected or full template)
  let profiles: string[] = [];
  if (features.includes("profiles")) {
    profiles = await multiselect({
      message: "Select environment profiles to create:",
      options: [...DEFAULT_PROFILES],
    });
  }

  // Git init
  const initGit = await confirm({
    message: "Initialize a git repository?",
    default: true,
  });

  return { name, description, template, features, profiles, initGit };
}

async function generateProject(targetDir: string, options: ProjectOptions): Promise<void> {
  // Ensure directory exists
  const { mkdir } = await import("node:fs/promises");
  await mkdir(targetDir, { recursive: true });

  // Generate package.json
  const packageJson = {
    name: options.name,
    version: "0.1.0",
    type: "module",
    description: options.description,
    bin: {
      [options.name]: "./src/app.ts",
    },
    scripts: {
      dev: "bun run src/app.ts",
      build: `bun build src/app.ts --compile --outfile=${options.name}`,
    },
    dependencies: {
      boune: "^0.8.0",
    },
  };

  await Bun.write(join(targetDir, "package.json"), JSON.stringify(packageJson, null, 2));

  // Generate source files
  await mkdir(join(targetDir, "src"), { recursive: true });

  if (options.template === "minimal") {
    await generateMinimalTemplate(targetDir, options);
  } else {
    await generateFullTemplate(targetDir, options);
  }

  // Generate config file if requested
  if (options.features.includes("config") || options.profiles.length > 0) {
    await generateConfigFile(targetDir, options);
  }

  // Generate .gitignore
  const gitignore = `node_modules/
dist/
*.log
.DS_Store
${options.name}
`;
  await Bun.write(join(targetDir, ".gitignore"), gitignore);
}

async function generateMinimalTemplate(targetDir: string, options: ProjectOptions): Promise<void> {
  const appTs = `#!/usr/bin/env bun

import { defineCli, defineCommand, color } from "boune";

const hello = defineCommand({
  name: "hello",
  description: "Say hello",
  arguments: {
    name: {
      type: "string",
      required: false,
      description: "Name to greet",
    },
  },
  action({ args }) {
    const name = args.name || "World";
    console.log(color.green(\`Hello, \${name}!\`));
  },
});

const cli = defineCli({
  name: "${options.name}",
  version: "0.1.0",
  description: "${options.description}",
  commands: { hello },
});

cli.run();
`;

  await Bun.write(join(targetDir, "src/app.ts"), appTs);
}

async function generateFullTemplate(targetDir: string, options: ProjectOptions): Promise<void> {
  // Create commands directory
  const { mkdir } = await import("node:fs/promises");
  await mkdir(join(targetDir, "src/commands"), { recursive: true });

  const hasPrompts = options.features.includes("prompts");

  // Generate hello command
  const helloTs = `import { defineCommand, color } from "boune";
${hasPrompts ? 'import { text } from "boune/prompt";' : ""}

export const hello = defineCommand({
  name: "hello",
  description: "Say hello",
  arguments: {
    name: {
      type: "string",
      required: false,
      description: "Name to greet",
    },
  },
  options: {
    uppercase: {
      type: "boolean",
      short: "u",
      description: "Print in uppercase",
    },
  },
  async action({ args, options }) {
    let name = args.name;
${
  hasPrompts
    ? `
    if (!name) {
      name = await text({
        message: "What is your name?",
        placeholder: "World",
        default: "World",
      });
    }`
    : '    if (!name) name = "World";'
}

    let greeting = \`Hello, \${name}!\`;
    if (options.uppercase) {
      greeting = greeting.toUpperCase();
    }

    console.log(color.green(greeting));
  },
});
`;

  await Bun.write(join(targetDir, "src/commands/hello.ts"), helloTs);

  // Generate commands index
  const indexTs = `export { hello } from "./hello.ts";
`;
  await Bun.write(join(targetDir, "src/commands/index.ts"), indexTs);

  // Generate main app
  const appTs = `#!/usr/bin/env bun

import { defineCli } from "boune";
import { hello } from "./commands/index.ts";

const cli = defineCli({
  name: "${options.name}",
  version: "0.1.0",
  description: "${options.description}",
  commands: {
    hello,
  },
});

cli.run();
`;

  await Bun.write(join(targetDir, "src/app.ts"), appTs);
}

async function generateConfigFile(targetDir: string, options: ProjectOptions): Promise<void> {
  const config: BouneConfig = {
    defaults: {
      verbose: false,
      color: "auto",
      output: "table",
    },
    commands: {},
    aliases: {},
    profiles: {},
  };

  // Add profiles
  for (const profile of options.profiles) {
    config.profiles![profile] = {
      defaults: {
        verbose: profile === "dev",
      },
      env: {
        NODE_ENV:
          profile === "prod" ? "production" : profile === "staging" ? "staging" : "development",
      },
    };
  }

  const configContent = `import type { BouneConfig } from "boune";

const config: BouneConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;

  await Bun.write(join(targetDir, "boune.config.ts"), configContent);
}
