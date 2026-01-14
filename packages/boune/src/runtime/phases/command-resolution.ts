import type { CommandConfig, Token } from "../../types/index.ts";
import { formatSuggestions, suggestCommands } from "../../output/suggest.ts";
import type { Phase } from "./types.ts";
import { formatError } from "../../x/logger/index.ts";
import { generateCliHelp } from "../../output/help.ts";

/**
 * Result of resolving a command path
 */
type ResolvedCommand = {
  command: CommandConfig;
  parentCommands: string[];
};

/**
 * Resolve a command from a path by walking the command tree
 */
function resolveCommandPath(
  commands: Record<string, CommandConfig>,
  path: string[],
): ResolvedCommand | null {
  const [first, ...rest] = path;
  const initialCommand = commands[first!];

  if (!initialCommand) {
    return null;
  }

  let command: CommandConfig = initialCommand;
  const parentCommands: string[] = [];

  for (const name of rest) {
    parentCommands.push(command.name);
    const sub = command.subcommands[name];
    if (!sub) break;
    command = sub;
  }

  return { command, parentCommands };
}

/**
 * Phase 4: Extract command path from tokens
 */
export const extractCommandPathPhase: Phase = {
  name: "extractCommandPath",
  run: (ctx, config) => {
    const commandPath: string[] = [];
    const argTokens: Token[] = [];
    let firstUnknownArg: string | null = null;
    let currentCommands = config.commands;

    for (const token of ctx.tokens) {
      if (token.type === "argument") {
        const cmd = currentCommands[token.value];
        if (cmd) {
          commandPath.push(token.value);
          currentCommands = cmd.subcommands;
          continue;
        }
        if (commandPath.length === 0 && firstUnknownArg === null) {
          firstUnknownArg = token.value;
        }
      }
      argTokens.push(token);
    }

    return {
      type: "continue",
      ctx: { ...ctx, commandPath, tokens: argTokens, firstUnknownArg },
    };
  },
};

/**
 * Phase 6: Handle no command / unknown command
 */
export const handleNoCommandPhase: Phase = {
  name: "handleNoCommand",
  run: (ctx, config) => {
    if (ctx.commandPath.length === 0) {
      if (ctx.firstUnknownArg) {
        const suggestions = suggestCommands(ctx.firstUnknownArg, config.commands);
        console.error(formatError(`Unknown command: ${ctx.firstUnknownArg}`));
        if (suggestions.length > 0) {
          console.error(formatSuggestions(suggestions));
        }
        return { type: "exit", code: 1 };
      }
      console.log(generateCliHelp(config));
      return { type: "exit" };
    }
    return { type: "continue", ctx };
  },
};

/**
 * Phase 7: Resolve command from path
 */
export const resolveCommandPhase: Phase = {
  name: "resolveCommand",
  run: (ctx, config) => {
    const resolved = resolveCommandPath(config.commands, ctx.commandPath);

    if (!resolved) {
      const suggestions = suggestCommands(ctx.commandPath[0] ?? "", config.commands);
      console.error(formatError(`Unknown command: ${ctx.commandPath.join(" ")}`));
      if (suggestions.length > 0) {
        console.error(formatSuggestions(suggestions));
      }
      return { type: "exit", code: 1 };
    }

    return {
      type: "continue",
      ctx: { ...ctx, ...resolved },
    };
  },
};
