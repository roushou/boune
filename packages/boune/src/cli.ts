/**
 * CLI runtime and execution engine
 */

import type {
  CliConfig,
  CommandConfig,
  MiddlewareContext,
  MiddlewareHandler,
  ValidationError,
} from "./types.ts";
import { type ShellType, generateCompletion } from "./completions/index.ts";
import { formatSuggestions, suggestCommands } from "./suggest.ts";
import { generateCliHelp, generateCommandHelp } from "./output/help.ts";
import { parseArguments, parseOptions, tokenize } from "./parser/index.ts";
import { closeStdin } from "./prompt/stdin.ts";
import { error as formatError } from "./output/format.ts";

/**
 * CLI runtime class
 *
 * Create instances using `defineCli()` from the define module.
 */
export class Cli {
  private config: CliConfig;

  private constructor(config: CliConfig) {
    this.config = config;
  }

  /**
   * Create a Cli instance from a pre-built configuration
   * @internal
   */
  static fromConfig(config: CliConfig): Cli {
    return new Cli(config);
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
   * Run middleware chain with next() pattern
   */
  private async runMiddleware(
    handlers: MiddlewareHandler[],
    ctx: MiddlewareContext,
    final: () => Promise<void>,
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < handlers.length) {
        const handler = handlers[index++]!;
        await handler(ctx, next);
      } else {
        await final();
      }
    };

    await next();
  }

  /**
   * Find command from path
   */
  private findCommand(
    commandPath: string[],
  ): { command: CommandConfig; parentCommands: string[] } | null {
    if (commandPath.length === 0) return null;

    const [first, ...rest] = commandPath;
    let command: CommandConfig | undefined = this.config.commands[first!];
    if (!command) return null;

    const parentCommands: string[] = [];
    for (const name of rest) {
      parentCommands.push(command.name);
      const sub: CommandConfig | undefined = command.subcommands[name];
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
        const potentialCmd = this.config.commands[token.value];
        if (potentialCmd) {
          commandPath.push(token.value);
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
          const sub = result.command.subcommands[token.value];
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

    // Build middleware context
    const middlewareCtx: MiddlewareContext = {
      command,
      args,
      options: allOptions,
      rawArgs: argv,
    };

    // Run the command with middleware
    try {
      // Combine global middleware with command's before middleware
      const beforeMiddleware: MiddlewareHandler[] = [
        ...(this.config.middleware ?? []),
        ...(command.before ?? []),
      ];

      // Run before middleware chain, then action
      await this.runMiddleware(beforeMiddleware, middlewareCtx, async () => {
        await command.action!({ args, options: allOptions, rawArgs: argv });
      });

      // Run after middleware (not in chain, just sequential)
      if (command.after) {
        for (const handler of command.after) {
          await handler(middlewareCtx, async () => {});
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Try command-level error handler first, then global
      const errorHandler = command.onError ?? this.config.onError;

      if (errorHandler) {
        await errorHandler(error, middlewareCtx);
      } else {
        console.error(formatError(error.message));
        process.exit(1);
      }
    } finally {
      // Close stdin to allow process to exit naturally
      closeStdin();
    }
  }
}
