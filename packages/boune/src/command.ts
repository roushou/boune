import type {
  ActionHandler,
  Argument,
  ArgumentDef,
  CommandConfig,
  HookHandler,
  HookType,
  InferArg,
  InferOpt,
  Option,
  OptionDef,
  ParsedArgs,
  ParsedOptions,
} from "./types.ts";

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
   */
  argument<const T extends Argument>(options: T): Command<TArgs & InferArg<T>, TOpts> {
    const def: ArgumentDef = {
      name: options.name,
      description: options.description ?? "",
      required: options.required,
      type: options.kind,
      default: options.default,
      variadic: options.variadic ?? false,
      validate: options.validate,
    };
    this.config.arguments.push(def);
    return this as Command<TArgs & InferArg<T>, TOpts>;
  }

  /**
   * Add an option (use kind: "boolean" for flags without values)
   */
  option<const T extends Option>(options: T): Command<TArgs, TOpts & InferOpt<T>> {
    const def: OptionDef = {
      name: options.name,
      short: options.short,
      long: options.long ?? options.name,
      description: options.description ?? "",
      type: options.kind,
      required: options.required ?? false,
      // Boolean options default to false (flags)
      default: options.kind === "boolean" ? (options.default ?? false) : options.default,
      env: options.env,
      validate: options.validate,
    };
    this.config.options.push(def);
    return this as Command<TArgs, TOpts & InferOpt<T>>;
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
