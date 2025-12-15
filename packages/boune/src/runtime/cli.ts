import type { CliConfig, MiddlewareContext, MiddlewareHandler } from "../types/index.ts";
import { type PipelineContext, createInitialContext, phases } from "./phases/index.ts";
import { type ShellType, generateCompletion } from "../completions/index.ts";
import { closeStdin } from "../prompt/stdin.ts";
import { error as formatError } from "../output/messages.ts";
import { runMiddleware } from "./middleware.ts";

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
   * Execute the command action with middleware
   */
  private async executeAction(ctx: PipelineContext): Promise<void> {
    const command = ctx.command!;
    const allOptions = { ...ctx.globalOptions, ...ctx.commandOptions };

    const middlewareCtx: MiddlewareContext = {
      command,
      args: ctx.args,
      options: allOptions,
      rawArgs: ctx.argv,
      prompts: command.prompts,
    };

    try {
      const beforeMiddleware: MiddlewareHandler[] = [
        ...(this.config.middleware ?? []),
        ...(command.before ?? []),
      ];

      await runMiddleware(beforeMiddleware, middlewareCtx, async () => {
        await command.action!({
          args: ctx.args,
          options: allOptions,
          rawArgs: ctx.argv,
          prompts: command.prompts,
        });
      });

      if (command.after) {
        for (const handler of command.after) {
          await handler(middlewareCtx, async () => {});
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorHandler = command.onError ?? this.config.onError;

      if (errorHandler) {
        await errorHandler(error, middlewareCtx);
      } else {
        console.error(formatError(error.message));
        process.exit(1);
      }
    }
  }

  /**
   * Run the pipeline phases
   */
  private async runPipeline(argv: string[]): Promise<void> {
    let ctx = createInitialContext(argv);

    for (const phase of phases) {
      const result = await phase.run(ctx, this.config);

      switch (result.type) {
        case "continue":
          ctx = result.ctx;
          break;
        case "exit":
          if (result.code) process.exit(result.code);
          return;
        case "execute":
          await this.executeAction(result.ctx);
          return;
      }
    }
  }

  /**
   * Parse argv and run the appropriate command
   */
  async run(argv: string[] = process.argv.slice(2)): Promise<void> {
    try {
      await this.runPipeline(argv);
    } finally {
      closeStdin();
    }
  }
}
