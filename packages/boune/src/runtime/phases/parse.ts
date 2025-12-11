/**
 * Command-specific parsing phases
 */

import { parseArguments, parseOptions } from "../../parser/index.ts";
import type { Phase } from "./types.ts";

/**
 * Phase 9: Parse command-specific options
 */
export const parseCommandOptionsPhase: Phase = {
  name: "parseCommandOptions",
  run: (ctx) => {
    if (!ctx.command) return { type: "continue", ctx };

    const { options, errors, remaining } = parseOptions(ctx.tokens, ctx.command.options);

    return {
      type: "continue",
      ctx: {
        ...ctx,
        commandOptions: options,
        tokens: remaining,
        errors: [...ctx.errors, ...errors],
      },
    };
  },
};

/**
 * Phase 10: Parse positional arguments
 */
export const parseArgumentsPhase: Phase = {
  name: "parseArguments",
  run: (ctx) => {
    if (!ctx.command) return { type: "continue", ctx };

    const positionalValues = ctx.tokens.filter((t) => t.type === "argument").map((t) => t.value);
    const { args, errors } = parseArguments(positionalValues, ctx.command.arguments);

    return {
      type: "continue",
      ctx: { ...ctx, args, errors: [...ctx.errors, ...errors] },
    };
  },
};
