import type {
  CliConfig,
  CommandConfig,
  ParsedArgs,
  ParsedOptions,
  Token,
  ValidationError,
} from "../../types/index.ts";

/**
 * Execution context passed through pipeline phases
 */
export type PipelineContext = {
  argv: string[];
  tokens: Token[];
  globalOptions: ParsedOptions;
  commandPath: string[];
  command: CommandConfig | null;
  parentCommands: string[];
  commandOptions: ParsedOptions;
  args: ParsedArgs;
  errors: ValidationError[];
  firstUnknownArg: string | null;
};

/**
 * Pipeline phase result
 */
export type PhaseResult =
  | { type: "continue"; ctx: PipelineContext }
  | { type: "exit"; code?: number }
  | { type: "execute"; ctx: PipelineContext };

/**
 * Pipeline phase definition
 */
export type Phase = {
  name: string;
  run: (ctx: PipelineContext, config: CliConfig) => PhaseResult | Promise<PhaseResult>;
};

/**
 * Create initial pipeline context
 */
export const createInitialContext = (argv: string[]): PipelineContext => ({
  argv,
  tokens: [],
  globalOptions: {},
  commandPath: [],
  command: null,
  parentCommands: [],
  commandOptions: {},
  args: {},
  errors: [],
  firstUnknownArg: null,
});
