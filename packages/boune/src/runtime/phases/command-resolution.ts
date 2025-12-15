import type { CommandConfig, Token } from "../../types/index.ts";
import { formatSuggestions, suggestCommands } from "../../output/suggest.ts";
import type { Phase } from "./types.ts";
import { error as formatError } from "../../output/messages.ts";
import { generateCliHelp } from "../../output/help.ts";

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
        if (cmd && commandPath.length === 0) {
          commandPath.push(token.value);
          currentCommands = cmd.subcommands;
          continue;
        }
        if (cmd && commandPath.length > 0) {
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
    const [first, ...rest] = ctx.commandPath;
    const initialCommand = config.commands[first!];

    if (!initialCommand) {
      const suggestions = suggestCommands(first ?? "", config.commands);
      console.error(formatError(`Unknown command: ${ctx.commandPath.join(" ")}`));
      if (suggestions.length > 0) {
        console.error(formatSuggestions(suggestions));
      }
      return { type: "exit", code: 1 };
    }

    let command: CommandConfig = initialCommand;
    const parentCommands: string[] = [];

    for (const name of rest) {
      parentCommands.push(command.name);
      const sub: CommandConfig | undefined = command.subcommands[name];
      if (!sub) break;
      command = sub;
    }

    return {
      type: "continue",
      ctx: { ...ctx, command, parentCommands },
    };
  },
};
