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
 * Configuration for rendering a help section
 */
type SectionConfig<T> = {
  title: string;
  items: T[];
  formatSyntax: (item: T) => string;
  getDescription: (item: T) => string;
  getMetadata: (item: T) => string[];
};

/**
 * Render a help section with aligned columns
 */
function renderSection<T>(config: SectionConfig<T>): string[] {
  const { title, items, formatSyntax, getDescription, getMetadata } = config;

  if (items.length === 0) return [];

  const maxLen = Math.max(...items.map((item) => formatSyntax(item).length));

  return [
    color.bold(`${title}:`),
    ...items.map((item) => {
      const syntax = formatSyntax(item);
      const description = getDescription(item);
      const metadata = getMetadata(item)
        .filter(Boolean)
        .map((m) => color.dim(m))
        .join("");
      return `  ${color.cyan(pad(syntax, maxLen + 2))}${description}${metadata}`;
    }),
    "",
  ];
}

/**
 * Metadata formatters for different item types
 */
const argumentMetadata = (arg: CommandConfig["arguments"][number]): string[] => [
  arg.choices?.length ? ` [choices: ${arg.choices.join(", ")}]` : "",
  arg.default !== undefined ? ` (default: ${JSON.stringify(arg.default)})` : "",
];

const optionMetadata = (opt: InternalOptionDef): string[] => [
  opt.choices?.length ? ` [choices: ${opt.choices.join(", ")}]` : "",
  opt.default !== undefined ? ` (default: ${JSON.stringify(opt.default)})` : "",
  opt.env ? ` (env: ${opt.env})` : "",
];

const simpleOptionMetadata = (opt: InternalOptionDef): string[] => [
  opt.choices?.length ? ` [choices: ${opt.choices.join(", ")}]` : "",
  opt.default !== undefined ? ` (default: ${JSON.stringify(opt.default)})` : "",
];

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
    lines.push(command.description, "");
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
  lines.push(usage, "");

  // Arguments section
  lines.push(
    ...renderSection({
      title: "Arguments",
      items: command.arguments,
      formatSyntax: formatArgument,
      getDescription: (arg) => arg.description,
      getMetadata: argumentMetadata,
    }),
  );

  // Options section
  const allOptions = [...command.options, ...globalOptions];
  lines.push(
    ...renderSection({
      title: "Options",
      items: allOptions,
      formatSyntax: formatOption,
      getDescription: (opt) => opt.description,
      getMetadata: optionMetadata,
    }),
  );

  // Subcommands section
  const visibleSubcommands = Object.values(command.subcommands).filter(
    (cmd, index, arr) => !cmd.hidden && arr.findIndex((c) => c.name === cmd.name) === index,
  );
  lines.push(
    ...renderSection({
      title: "Commands",
      items: visibleSubcommands,
      formatSyntax: (cmd) => cmd.name,
      getDescription: (cmd) => cmd.description,
      getMetadata: () => [],
    }),
  );

  // Aliases
  if (command.aliases.length > 0) {
    lines.push(color.bold("Aliases:"), `  ${command.aliases.join(", ")}`, "");
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
    lines.push(config.description, "");
  }

  // Usage
  lines.push(color.bold("Usage:"), `  ${config.name} <command> [options]`, "");

  // Global options section
  lines.push(
    ...renderSection({
      title: "Options",
      items: config.globalOptions,
      formatSyntax: formatOption,
      getDescription: (opt) => opt.description,
      getMetadata: simpleOptionMetadata,
    }),
  );

  // Commands section
  const visibleCommands = Object.values(config.commands).filter(
    (cmd, index, arr) => !cmd.hidden && arr.findIndex((c) => c.name === cmd.name) === index,
  );
  lines.push(
    ...renderSection({
      title: "Commands",
      items: visibleCommands,
      formatSyntax: (cmd) => cmd.name,
      getDescription: (cmd) => cmd.description,
      getMetadata: () => [],
    }),
  );

  // Version
  if (config.version) {
    lines.push(color.dim(`v${config.version}`));
  }

  return lines.join("\n");
}
