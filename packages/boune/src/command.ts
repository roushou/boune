import type {
  ActionHandler,
  ArgumentConfig,
  ArgumentDef,
  ArgumentType,
  CommandConfig,
  ExtractArgName,
  ExtractOptionName,
  HookHandler,
  HookType,
  InferOptionType,
  IsArgRequired,
  IsArgVariadic,
  MapArgType,
  OptionConfig,
  OptionDef,
  OptionHasValue,
  ParsedArgs,
  ParsedOptions,
} from "./types.ts";

/**
 * Parse argument syntax like "<name>" or "[name]" or "<files...>"
 */
function parseArgumentSyntax(syntax: string): Pick<ArgumentDef, "name" | "required" | "variadic"> {
  // Check for variadic inside brackets: <files...> or [files...]
  const isRequired = syntax.startsWith("<");
  const isOptional = syntax.startsWith("[");

  // Remove brackets
  let inner = syntax;
  if (isRequired && syntax.endsWith(">")) {
    inner = syntax.slice(1, -1);
  } else if (isOptional && syntax.endsWith("]")) {
    inner = syntax.slice(1, -1);
  }

  // Check for variadic
  const variadic = inner.endsWith("...");
  const name = variadic ? inner.slice(0, -3) : inner;

  return {
    name,
    required: isRequired,
    variadic,
  };
}

/**
 * Parse option syntax like "-v, --verbose" or "--name <value>"
 */
function parseOptionSyntax(syntax: string): Pick<OptionDef, "name" | "short" | "type"> {
  const parts = syntax.split(/[,\s]+/).filter(Boolean);
  let name = "";
  let short: string | undefined;
  let type: ArgumentType = "boolean";

  for (const part of parts) {
    if (part.startsWith("--")) {
      name = part.slice(2);
    } else if (part.startsWith("-") && part.length === 2) {
      short = part.slice(1);
    } else if (part.startsWith("<") || part.startsWith("[")) {
      type = "string";
    }
  }

  return { name, short, type };
}

/**
 * Fluent command builder with full type inference
 */
export class Command<
  TArgs extends ParsedArgs = ParsedArgs,
  TOpts extends ParsedOptions = ParsedOptions,
> {
  private config: CommandConfig;

  constructor(name: string) {
    this.config = {
      name,
      description: "",
      aliases: [],
      arguments: [],
      options: [],
      subcommands: new Map(),
      hooks: new Map(),
      hidden: false,
    };
  }

  /**
   * Set command description
   */
  description(desc: string): this {
    this.config.description = desc;
    return this;
  }

  /**
   * Add command aliases
   */
  alias(...aliases: string[]): this {
    this.config.aliases.push(...aliases);
    return this;
  }

  /**
   * Add a positional argument
   * @param syntax - Argument syntax like "<name>" (required) or "[name]" (optional) or "<files...>" (variadic)
   * @param description - Argument description
   * @param options - Additional options
   */
  argument<TSyntax extends string, TType extends ArgumentType = "string">(
    syntax: TSyntax,
    description: string,
    options?: ArgumentConfig<TType>,
  ): Command<
    TArgs & {
      [K in ExtractArgName<TSyntax>]: IsArgRequired<TSyntax> extends true
        ? MapArgType<TType, IsArgVariadic<TSyntax>>
        : MapArgType<TType, IsArgVariadic<TSyntax>> | undefined;
    },
    TOpts
  > {
    const parsed = parseArgumentSyntax(syntax);
    this.config.arguments.push({
      ...parsed,
      description,
      type: options?.type ?? "string",
      default: options?.default,
      validate: options?.validate,
    });
    return this as unknown as Command<
      TArgs & {
        [K in ExtractArgName<TSyntax>]: IsArgRequired<TSyntax> extends true
          ? MapArgType<TType, IsArgVariadic<TSyntax>>
          : MapArgType<TType, IsArgVariadic<TSyntax>> | undefined;
      },
      TOpts
    >;
  }

  /**
   * Add an option/flag
   * @param syntax - Option syntax like "-v, --verbose" or "-n, --name <value>"
   * @param description - Option description
   * @param options - Additional options
   */
  option<
    TSyntax extends string,
    TType extends ArgumentType = OptionHasValue<TSyntax> extends true ? "string" : "boolean",
  >(
    syntax: TSyntax,
    description: string,
    options?: OptionConfig<TType>,
  ): Command<
    TArgs,
    TOpts & { [K in ExtractOptionName<TSyntax>]: InferOptionType<OptionHasValue<TSyntax>, TType> }
  > {
    const parsed = parseOptionSyntax(syntax);
    this.config.options.push({
      ...parsed,
      description,
      type: options?.type ?? parsed.type,
      default: options?.default,
      required: options?.required ?? false,
      env: options?.env,
      validate: options?.validate,
    });
    return this as unknown as Command<
      TArgs,
      TOpts & { [K in ExtractOptionName<TSyntax>]: InferOptionType<OptionHasValue<TSyntax>, TType> }
    >;
  }

  /**
   * Add a subcommand
   */
  subcommand(cmd: Command): this {
    const cmdConfig = cmd.getConfig();
    this.config.subcommands.set(cmdConfig.name, cmdConfig);
    for (const alias of cmdConfig.aliases) {
      this.config.subcommands.set(alias, cmdConfig);
    }
    return this;
  }

  /**
   * Set the action handler for this command
   */
  action(handler: ActionHandler<TArgs, TOpts>): this {
    this.config.action = handler as ActionHandler;
    return this;
  }

  /**
   * Add a hook
   */
  hook(type: HookType, handler: HookHandler): this {
    const handlers = this.config.hooks.get(type) ?? [];
    handlers.push(handler);
    this.config.hooks.set(type, handlers);
    return this;
  }

  /**
   * Hide command from help output
   */
  hidden(hide = true): this {
    this.config.hidden = hide;
    return this;
  }

  /**
   * Get the internal configuration
   */
  getConfig(): CommandConfig {
    return this.config;
  }
}

/**
 * Create a new command
 */
export function command(name: string): Command {
  return new Command(name);
}
