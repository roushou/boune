import type { ParsedArgs, ParsedOptions } from "./core.ts";
import type { CommandConfig } from "./command.ts";
import type { RunnablePrompt } from "./prompt.ts";

/** Record of runnable prompts */
export type PromptsRecord = Record<string, RunnablePrompt<unknown>>;

/** Context passed to command action */
export interface ActionContext<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
  TPrompts extends PromptsRecord = PromptsRecord,
> {
  args: TArgs;
  options: TOpts;
  rawArgs: string[];
  prompts: TPrompts;
}

/** Command action handler */
export type ActionHandler<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
  TPrompts extends PromptsRecord = PromptsRecord,
> = (context: ActionContext<TArgs, TOpts, TPrompts>) => void | Promise<void>;

/** Context passed to middleware handlers */
export interface MiddlewareContext<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
  TPrompts extends PromptsRecord = PromptsRecord,
> extends ActionContext<TArgs, TOpts, TPrompts> {
  /** The command being executed */
  command: CommandConfig;
}

/**
 * Middleware handler that wraps command execution
 *
 * @example
 * ```typescript
 * const loggingMiddleware: MiddlewareHandler = async (ctx, next) => {
 *   console.log(`Running command: ${ctx.command.name}`);
 *   await next();
 *   console.log(`Command completed`);
 * };
 * ```
 */
export type MiddlewareHandler = (
  ctx: MiddlewareContext,
  next: () => Promise<void>,
) => void | Promise<void>;

/**
 * Error handler for command execution errors
 *
 * @example
 * ```typescript
 * const errorHandler: ErrorHandler = (error, ctx) => {
 *   console.error(`Error in ${ctx.command.name}: ${error.message}`);
 * };
 * ```
 */
export type ErrorHandler = (error: Error, ctx: MiddlewareContext) => void | Promise<void>;
