/**
 * Global options parsing phase
 */

import type { Phase } from "./types.ts";
import { parseOptions } from "../../parser/index.ts";

/**
 * Phase 2: Parse global options
 */
export const parseGlobalOptionsPhase: Phase = {
  name: "parseGlobalOptions",
  run: (ctx, config) => {
    const { options, errors, remaining } = parseOptions(ctx.tokens, config.globalOptions, true);
    return {
      type: "continue",
      ctx: {
        ...ctx,
        globalOptions: options,
        tokens: remaining,
        errors: [...ctx.errors, ...errors],
      },
    };
  },
};
