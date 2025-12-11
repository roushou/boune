/**
 * Action and middleware handler types
 */

import type { ParsedArgs, ParsedOptions } from "./core.ts";
import type { CommandConfig } from "./command.ts";

/** Context passed to command action */
export interface ActionContext<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
> {
  args: TArgs;
  options: TOpts;
  rawArgs: string[];
}

/** Command action handler */
export type ActionHandler<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
> = (context: ActionContext<TArgs, TOpts>) => void | Promise<void>;

/** Context passed to middleware handlers */
export interface MiddlewareContext<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
> extends ActionContext<TArgs, TOpts> {
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
