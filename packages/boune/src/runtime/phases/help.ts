import { generateCliHelp, generateCommandHelp } from "../../output/help.ts";
import type { Phase } from "./types.ts";

/**
 * Phase 3: Handle --version flag
 */
export const handleVersionPhase: Phase = {
  name: "handleVersion",
  run: (ctx, config) => {
    if (ctx.globalOptions["version"]) {
      console.log(config.version || "0.0.0");
      return { type: "exit" };
    }
    return { type: "continue", ctx };
  },
};

/**
 * Phase 5: Handle --help at root level
 */
export const handleRootHelpPhase: Phase = {
  name: "handleRootHelp",
  run: (ctx, config) => {
    if (ctx.globalOptions["help"] && ctx.commandPath.length === 0) {
      console.log(generateCliHelp(config));
      return { type: "exit" };
    }
    return { type: "continue", ctx };
  },
};

/**
 * Phase 8: Handle --help for command
 */
export const handleCommandHelpPhase: Phase = {
  name: "handleCommandHelp",
  run: (ctx, config) => {
    if (ctx.globalOptions["help"] && ctx.command) {
      console.log(
        generateCommandHelp(ctx.command, config.name, ctx.parentCommands, config.globalOptions),
      );
      return { type: "exit" };
    }
    return { type: "continue", ctx };
  },
};
