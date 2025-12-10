import type {
  ArgumentType,
  CliConfig,
  CommandConfig,
  HookHandler,
  HookType,
  OptionDef,
  ParsedArgs,
  ParsedOptions,
  ValidationError,
} from "./types.ts";
import { Command } from "./command.ts";
import { parseArguments, parseOptions, tokenize } from "./parser/index.ts";
import { generateCliHelp, generateCommandHelp } from "./output/help.ts";
import { error as formatError } from "./output/format.ts";
import { closeStdin } from "./prompt/stdin.ts";
import { suggestCommands, formatSuggestions } from "./suggest.ts";
import { generateCompletion, type ShellType } from "./completions/index.ts";

/**
 * Main CLI builder class
 */
export class Cli {
  private config: CliConfig;

  constructor(name: string) {
    this.config = {
      name,
      version: "",
      description: "",
      commands: new Map(),
      globalOptions: [
        {
          name: "help",
          short: "h",
          description: "Show help",
          type: "boolean",
          required: false,
          default: false,
        },
      ],
      hooks: new Map(),
    };
  }

  /**
   * Set CLI version
   */
  version(version: string): this {
    this.config.version = version;
    // Add --version flag
    this.config.globalOptions.push({
      name: "version",
      short: "V",
      description: "Show version",
      type: "boolean",
      required: false,
      default: false,
    });
    return this;
  }

  /**
   * Set CLI description
   */
  description(desc: string): this {
    this.config.description = desc;
    return this;
  }

  /**
   * Add a command
   */
  command(cmd: Command): this {
    const cmdConfig = cmd.getConfig();
    this.config.commands.set(cmdConfig.name, cmdConfig);
    for (const alias of cmdConfig.aliases) {
      this.config.commands.set(alias, cmdConfig);
    }
    return this;
  }

  /**
   * Add a global option
   */
  option(
    syntax: string,
    description: string,
    options?: { type?: ArgumentType; default?: unknown; required?: boolean; env?: string },
  ): this {
    const parsed = this.parseOptionSyntax(syntax);
    this.config.globalOptions.push({
      ...parsed,
      description,
      type: options?.type ?? parsed.type,
      default: options?.default,
      required: options?.required ?? false,
      env: options?.env,
    });
    return this;
  }

  /**
   * Add a global hook
   */
  hook(type: HookType, handler: HookHandler): this {
    const handlers = this.config.hooks.get(type) ?? [];
    handlers.push(handler);
    this.config.hooks.set(type, handlers);
    return this;
  }

  /**
   * Generate shell completion script
   */
  completions(shell: ShellType): string {
    return generateCompletion(this.config, shell);
  }

  /**
   * Get the CLI configuration (for advanced use cases)
   */
  getConfig(): CliConfig {
    return this.config;
  }

  /**
   * Parse option syntax
   */
  private parseOptionSyntax(syntax: string): Pick<OptionDef, "name" | "short" | "type"> {
    const parts = syntax.split(/[,\s]+/).filter(Boolean);
    let name = "";
    let short: string | undefined;
    let type: ArgumentType = "boolean";

    for (const part of parts) {
      if (part.startsWith("--")) {
        name = part.slice(2);
      } else if (part.startsWith("-") && part.length === 2) {
        short = part.slice(1);
      } else if (part.startsWith("<") || part.startsWith("[")) {
        type = "string";
      }
    }

    return { name, short, type };
  }

  /**
   * Run hooks of a specific type
   */
  private async runHooks(
    type: HookType,
    command: CommandConfig,
    args: ParsedArgs,
    options: ParsedOptions,
    error?: Error,
  ): Promise<void> {
    // Run global hooks
    const globalHooks = this.config.hooks.get(type) ?? [];
    for (const handler of globalHooks) {
      await handler({ command, args, options, error });
    }

    // Run command hooks
    const commandHooks = command.hooks.get(type) ?? [];
    for (const handler of commandHooks) {
      await handler({ command, args, options, error });
    }
  }

  /**
   * Find command from path
   */
  private findCommand(
    commandPath: string[],
  ): { command: CommandConfig; parentCommands: string[] } | null {
    if (commandPath.length === 0) return null;

    const [first, ...rest] = commandPath;
    let command = this.config.commands.get(first!);
    if (!command) return null;

    const parentCommands: string[] = [];
    for (const name of rest) {
      parentCommands.push(command.name);
      const sub = command.subcommands.get(name);
      if (!sub) break;
      command = sub;
    }

    return { command, parentCommands };
  }

  /**
   * Parse argv and run the appropriate command
   */
  async run(argv: string[] = process.argv.slice(2)): Promise<void> {
    const tokens = tokenize(argv);

    // Parse global options first
    const {
      options: globalOpts,
      errors: globalErrors,
      remaining,
    } = parseOptions(
      tokens,
      this.config.globalOptions,
      true, // Allow unknown options (they might be command-specific)
    );

    // Handle --version
    if (globalOpts["version"]) {
      console.log(this.config.version || "0.0.0");
      return;
    }

    // Extract command path from remaining tokens
    const commandPath: string[] = [];
    const argTokens: typeof remaining = [];
    let firstUnknownArg: string | null = null;

    for (const token of remaining) {
      if (token.type === "argument" && commandPath.length === 0) {
        // First check if it's a command
        const potentialCmd = this.config.commands.get(token.value);
        if (potentialCmd) {
          commandPath.push(token.value);
          // Check for subcommands
          let currentCmd = potentialCmd;
          continue;
        } else if (firstUnknownArg === null) {
          // Track first argument that could be an unknown command
          firstUnknownArg = token.value;
        }
      }

      // Check if it's a subcommand
      if (commandPath.length > 0 && token.type === "argument") {
        const result = this.findCommand(commandPath);
        if (result) {
          const sub = result.command.subcommands.get(token.value);
          if (sub) {
            commandPath.push(token.value);
            continue;
          }
        }
      }

      argTokens.push(token);
    }

    // Handle --help at root level
    if (globalOpts["help"] && commandPath.length === 0) {
      console.log(generateCliHelp(this.config));
      return;
    }

    // No command specified
    if (commandPath.length === 0) {
      // Check if first argument looks like an unknown command
      if (firstUnknownArg) {
        const suggestions = suggestCommands(firstUnknownArg, this.config.commands);
        console.error(formatError(`Unknown command: ${firstUnknownArg}`));
        if (suggestions.length > 0) {
          console.error(formatSuggestions(suggestions));
        }
        process.exit(1);
      }
      // Show help
      console.log(generateCliHelp(this.config));
      return;
    }

    // Find the command
    const result = this.findCommand(commandPath);
    if (!result) {
      const input = commandPath[0] ?? "";
      const suggestions = suggestCommands(input, this.config.commands);
      console.error(formatError(`Unknown command: ${commandPath.join(" ")}`));
      if (suggestions.length > 0) {
        console.error(formatSuggestions(suggestions));
      }
      process.exit(1);
    }

    const { command, parentCommands } = result;

    // Handle --help for command
    if (globalOpts["help"]) {
      console.log(
        generateCommandHelp(command, this.config.name, parentCommands, this.config.globalOptions),
      );
      return;
    }

    // Parse command-specific options
    const {
      options: cmdOpts,
      errors: cmdErrors,
      remaining: cmdRemaining,
    } = parseOptions(argTokens, command.options);

    // Merge options
    const allOptions = { ...globalOpts, ...cmdOpts };

    // Parse positional arguments
    const positionalValues = cmdRemaining.filter((t) => t.type === "argument").map((t) => t.value);
    const { args, errors: argErrors } = parseArguments(positionalValues, command.arguments);

    // Collect all errors
    const allErrors: ValidationError[] = [...globalErrors, ...cmdErrors, ...argErrors];

    if (allErrors.length > 0) {
      for (const err of allErrors) {
        console.error(formatError(err.message));
      }
      process.exit(1);
    }

    // Check if command has an action
    if (!command.action) {
      // Show command help if no action
      console.log(
        generateCommandHelp(command, this.config.name, parentCommands, this.config.globalOptions),
      );
      return;
    }

    // Run the command
    try {
      await this.runHooks("preAction", command, args, allOptions);
      await command.action({ args, options: allOptions, rawArgs: argv });
      await this.runHooks("postAction", command, args, allOptions);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      await this.runHooks("preError", command, args, allOptions, error);
      console.error(formatError(error.message));
      await this.runHooks("postError", command, args, allOptions, error);
      process.exit(1);
    } finally {
      // Close stdin to allow process to exit naturally
      closeStdin();
    }
  }
}

/**
 * Create a new CLI
 */
export function cli(name: string): Cli {
  return new Cli(name);
}
