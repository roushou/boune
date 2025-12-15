import type { Phase } from "./types.ts";
import { tokenize } from "../../parser/index.ts";

/**
 * Phase 1: Tokenize argv
 */
export const tokenizePhase: Phase = {
  name: "tokenize",
  run: (ctx) => ({
    type: "continue",
    ctx: { ...ctx, tokens: tokenize(ctx.argv) },
  }),
};
