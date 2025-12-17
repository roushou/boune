import type { CliConfig, CommandConfig, InternalOptionDef } from "../types/index.ts";
import { color } from "./color.ts";

/**
 * Format argument syntax for display
 */
function formatArgument(argument: { name: string; required: boolean; variadic?: boolean }): string {
  const name = argument.variadic ? `${argument.name}...` : argument.name;
  return argument.required ? `<${name}>` : `[${name}]`;
}

/**
 * Format option syntax for display
 */
function formatOption(option: InternalOptionDef): string {
  const parts: string[] = [];
  if (option.short) parts.push(`-${option.short}`);
  const longFlag = option.long ?? option.name;
  parts.push(`--${longFlag}`);
  if (option.type !== "boolean") {
    parts[parts.length - 1] += ` <${option.type}>`;
  }
  return parts.join(", ");
}

/**
 * Pad string to width
 */
function pad(str: string, width: number): string {
  return str + " ".repeat(Math.max(0, width - str.length));
}

/**
 * Generate help text for a command
 */
export function generateCommandHelp(
  command: CommandConfig,
  cliName: string,
  parentCommands: string[] = [],
  globalOptions: InternalOptionDef[] = [],
): string {
  const lines: string[] = [];
  const commandPath = [cliName, ...parentCommands, command.name].join(" ");

  // Description
  if (command.description) {
    lines.push(command.description);
    lines.push("");
  }

  // Usage
  lines.push(color.bold("Usage:"));
  let usage = `  ${commandPath}`;
  if (Object.keys(command.subcommands).length > 0) {
    usage += " <command>";
  }
  if (command.options.length > 0 || globalOptions.length > 0) {
    usage += " [options]";
  }
  for (const argument of command.arguments) {
    usage += ` ${formatArgument(argument)}`;
  }
  lines.push(usage);
  lines.push("");

  // Arguments
  if (command.arguments.length > 0) {
    lines.push(color.bold("Arguments:"));
    const maxArgLen = Math.max(...command.arguments.map((a) => formatArgument(a).length));
    for (const argument of command.arguments) {
      const syntax = formatArgument(argument);
      let line = `  ${color.cyan(pad(syntax, maxArgLen + 2))}${argument.description}`;
      if (argument.choices && argument.choices.length > 0) {
        line += color.dim(` [choices: ${argument.choices.join(", ")}]`);
      }
      if (argument.default !== undefined) {
        line += color.dim(` (default: ${JSON.stringify(argument.default)})`);
      }
      lines.push(line);
    }
    lines.push("");
  }

  // Options
  const allOptions = [...command.options, ...globalOptions];
  if (allOptions.length > 0) {
    lines.push(color.bold("Options:"));
    const maxOptLen = Math.max(...allOptions.map((o) => formatOption(o).length));
    for (const option of allOptions) {
      const syntax = formatOption(option);
      let line = `  ${color.cyan(pad(syntax, maxOptLen + 2))}${option.description}`;
      if (option.choices && option.choices.length > 0) {
        line += color.dim(` [choices: ${option.choices.join(", ")}]`);
      }
      if (option.default !== undefined) {
        line += color.dim(` (default: ${JSON.stringify(option.default)})`);
      }
      if (option.env) {
        line += color.dim(` (env: ${option.env})`);
      }
      lines.push(line);
    }
    lines.push("");
  }

  // Subcommands
  const visibleSubcommands = Object.values(command.subcommands).filter(
    (cmd, index, arr) => !cmd.hidden && arr.findIndex((c) => c.name === cmd.name) === index,
  );
  if (visibleSubcommands.length > 0) {
    lines.push(color.bold("Commands:"));
    const maxCmdLen = Math.max(...visibleSubcommands.map((c) => c.name.length));
    for (const cmd of visibleSubcommands) {
      lines.push(`  ${color.cyan(pad(cmd.name, maxCmdLen + 2))}${cmd.description}`);
    }
    lines.push("");
  }

  // Aliases
  if (command.aliases.length > 0) {
    lines.push(color.bold("Aliases:"));
    lines.push(`  ${command.aliases.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate help text for the CLI
 */
export function generateCliHelp(config: CliConfig): string {
  const lines: string[] = [];

  // Description
  if (config.description) {
    lines.push(config.description);
    lines.push("");
  }

  // Usage
  lines.push(color.bold("Usage:"));
  lines.push(`  ${config.name} <command> [options]`);
  lines.push("");

  // Global options
  if (config.globalOptions.length > 0) {
    lines.push(color.bold("Options:"));
    const maxOptLen = Math.max(...config.globalOptions.map((o) => formatOption(o).length));
    for (const option of config.globalOptions) {
      const syntax = formatOption(option);
      let line = `  ${color.cyan(pad(syntax, maxOptLen + 2))}${option.description}`;
      if (option.choices && option.choices.length > 0) {
        line += color.dim(` [choices: ${option.choices.join(", ")}]`);
      }
      if (option.default !== undefined) {
        line += color.dim(` (default: ${JSON.stringify(option.default)})`);
      }
      lines.push(line);
    }
    lines.push("");
  }

  // Commands
  const visibleCommands = Object.values(config.commands).filter(
    (cmd, index, arr) => !cmd.hidden && arr.findIndex((c) => c.name === cmd.name) === index,
  );
  if (visibleCommands.length > 0) {
    lines.push(color.bold("Commands:"));
    const maxCmdLen = Math.max(...visibleCommands.map((c) => c.name.length));
    for (const cmd of visibleCommands) {
      lines.push(`  ${color.cyan(pad(cmd.name, maxCmdLen + 2))}${cmd.description}`);
    }
    lines.push("");
  }

  // Version
  if (config.version) {
    lines.push(color.dim(`v${config.version}`));
  }

  return lines.join("\n");
}
