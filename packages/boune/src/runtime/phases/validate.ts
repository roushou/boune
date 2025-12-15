/**
 * Validation and action check phases
 */

import type { Phase } from "./types.ts";
import { error as formatError } from "../../output/messages.ts";
import { generateCommandHelp } from "../../output/help.ts";

/**
 * Phase 11: Validate and check for errors
 */
export const validatePhase: Phase = {
  name: "validate",
  run: (ctx) => {
    if (ctx.errors.length > 0) {
      for (const err of ctx.errors) {
        console.error(formatError(err.message));
      }
      return { type: "exit", code: 1 };
    }
    return { type: "continue", ctx };
  },
};

/**
 * Phase 12: Check if command has action, show help if not
 */
export const checkActionPhase: Phase = {
  name: "checkAction",
  run: (ctx, config) => {
    if (!ctx.command?.action) {
      console.log(
        generateCommandHelp(ctx.command!, config.name, ctx.parentCommands, config.globalOptions),
      );
      return { type: "exit" };
    }
    return { type: "execute", ctx };
  },
};
