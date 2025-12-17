import type { InternalOptionDef, ParsedOptions, Token, ValidationError } from "../types/index.ts";
import { coerceValue } from "./args.ts";

/**
 * Build a lookup map for options by long flag, short flag, and name
 */
const buildOptionMap = (definitions: InternalOptionDef[]): Map<string, InternalOptionDef> =>
  definitions.reduce((map, def) => {
    if (def.long) map.set(def.long, def);
    map.set(def.name, def);
    if (def.short) map.set(def.short, def);
    return map;
  }, new Map<string, InternalOptionDef>());

/**
 * Option parsing state
 */
type OptionParseState = {
  options: ParsedOptions;
  errors: ValidationError[];
  remaining: Token[];
  seenOptions: Set<string>;
  expecting: InternalOptionDef | null;
  afterSeparator: boolean;
  skipNext: boolean;
};

/**
 * Initial state factory
 */
const createInitialState = (): OptionParseState => ({
  options: {},
  errors: [],
  remaining: [],
  seenOptions: new Set(),
  expecting: null,
  afterSeparator: false,
  skipNext: false,
});

/**
 * Handle separator token
 */
const handleSeparator = (state: OptionParseState): OptionParseState => ({
  ...state,
  afterSeparator: true,
});

/**
 * Handle non-option token (argument or after separator)
 */
const handleNonOption = (state: OptionParseState, token: Token): OptionParseState => ({
  ...state,
  remaining: [...state.remaining, token],
});

/**
 * Handle value token when expecting a value for previous option
 */
const handleExpectedValue = (
  state: OptionParseState,
  token: Token,
  def: InternalOptionDef,
): OptionParseState => {
  const result = coerceValue(token.value, def.type);
  return result.ok
    ? {
        ...state,
        options: { ...state.options, [def.name]: result.value },
        expecting: null,
      }
    : {
        ...state,
        errors: [
          ...state.errors,
          {
            type: "invalid_type",
            message: `Invalid value for --${def.name}: ${result.error}`,
            field: def.name,
          },
        ],
        expecting: null,
      };
};

/**
 * Handle unknown option
 */
const handleUnknownOption = (
  state: OptionParseState,
  token: Token,
  nextToken: Token | undefined,
  allowUnknown: boolean,
): OptionParseState => {
  if (allowUnknown) {
    const hasValue = Boolean(
      nextToken && (nextToken.type === "value" || nextToken.type === "argument"),
    );
    return {
      ...state,
      remaining: hasValue ? [...state.remaining, token, nextToken!] : [...state.remaining, token],
      skipNext: hasValue,
    };
  }
  return {
    ...state,
    errors: [
      ...state.errors,
      { type: "unknown_option", message: `Unknown option: ${token.raw}`, field: token.value },
    ],
  };
};

/**
 * Handle boolean option
 */
const handleBooleanOption = (
  state: OptionParseState,
  def: InternalOptionDef,
  nextToken: Token | undefined,
): OptionParseState => {
  // Check if next token is an explicit boolean value
  if (nextToken?.type === "value") {
    const result = coerceValue(nextToken.value, "boolean");
    if (result.ok) {
      return {
        ...state,
        options: { ...state.options, [def.name]: result.value },
        seenOptions: new Set([...state.seenOptions, def.name]),
        skipNext: true,
      };
    }
  }
  // No explicit value, set to true
  return {
    ...state,
    options: { ...state.options, [def.name]: true },
    seenOptions: new Set([...state.seenOptions, def.name]),
  };
};

/**
 * Handle non-boolean option (needs value)
 */
const handleValueOption = (
  state: OptionParseState,
  def: InternalOptionDef,
  nextToken: Token | undefined,
): OptionParseState => {
  if (nextToken?.type === "value") {
    const result = coerceValue(nextToken.value, def.type);
    return result.ok
      ? {
          ...state,
          options: { ...state.options, [def.name]: result.value },
          seenOptions: new Set([...state.seenOptions, def.name]),
          skipNext: true,
        }
      : {
          ...state,
          errors: [
            ...state.errors,
            {
              type: "invalid_type",
              message: `Invalid value for --${def.name}: ${result.error}`,
              field: def.name,
            },
          ],
          seenOptions: new Set([...state.seenOptions, def.name]),
          skipNext: true,
        };
  }

  if (nextToken?.type === "argument") {
    const result = coerceValue(nextToken.value, def.type);
    if (result.ok) {
      return {
        ...state,
        options: { ...state.options, [def.name]: result.value },
        seenOptions: new Set([...state.seenOptions, def.name]),
        skipNext: true,
      };
    }
  }

  return {
    ...state,
    errors: [
      ...state.errors,
      { type: "invalid_type", message: `Option --${def.name} requires a value`, field: def.name },
    ],
    seenOptions: new Set([...state.seenOptions, def.name]),
  };
};

/**
 * Handle option token
 */
const handleOption = (
  state: OptionParseState,
  token: Token,
  nextToken: Token | undefined,
  optionMap: Map<string, InternalOptionDef>,
  allowUnknown: boolean,
): OptionParseState => {
  const def = optionMap.get(token.value);

  if (!def) {
    return handleUnknownOption(state, token, nextToken, allowUnknown);
  }

  return def.type === "boolean"
    ? handleBooleanOption(state, def, nextToken)
    : handleValueOption(state, def, nextToken);
};

/**
 * Create reducer for option parsing
 */
const createOptionReducer =
  (optionMap: Map<string, InternalOptionDef>, allowUnknown: boolean, tokens: Token[]) =>
  (state: OptionParseState, token: Token, index: number): OptionParseState => {
    // Skip this token if previous iteration consumed it
    if (state.skipNext) {
      return { ...state, skipNext: false };
    }

    // Handle expecting value from previous option
    if (state.expecting) {
      return handleExpectedValue(state, token, state.expecting);
    }

    // After separator, everything is an argument
    if (state.afterSeparator) {
      return handleNonOption(state, token);
    }

    // Handle separator
    if (token.type === "separator") {
      return handleSeparator(state);
    }

    // Non-option tokens go to remaining
    if (token.type !== "option") {
      return handleNonOption(state, token);
    }

    // Handle option
    const nextToken = tokens[index + 1];
    return handleOption(state, token, nextToken, optionMap, allowUnknown);
  };

/**
 * Apply defaults from definition
 */
type DefaultResult = {
  value: unknown;
  error?: ValidationError;
};

const resolveDefault = (def: InternalOptionDef): DefaultResult => {
  // Check environment variable first
  if (def.env) {
    const envValue = process.env[def.env];
    if (envValue !== undefined) {
      const result = coerceValue(envValue, def.type);
      if (result.ok) {
        return { value: result.value };
      }
    }
  }

  // Apply default value
  if (def.default !== undefined) {
    return { value: def.default };
  }

  // Required but missing
  if (def.required) {
    return {
      value: undefined,
      error: {
        type: "missing_required",
        message: `Missing required option: --${def.name}`,
        field: def.name,
      },
    };
  }

  return { value: undefined };
};

/**
 * Apply defaults and env vars for unseen options
 */
const applyDefaults = (
  options: ParsedOptions,
  errors: ValidationError[],
  definitions: InternalOptionDef[],
  seenOptions: Set<string>,
): { options: ParsedOptions; errors: ValidationError[] } => {
  const unseenDefs = definitions.filter((def) => !seenOptions.has(def.name));
  const results = unseenDefs.map((def) => ({ def, result: resolveDefault(def) }));

  const newOptions = results.reduce(
    (opts, { def, result }) =>
      result.value !== undefined ? { ...opts, [def.name]: result.value } : opts,
    options,
  );

  const newErrors = results.filter(({ result }) => result.error).map(({ result }) => result.error!);

  return {
    options: newOptions,
    errors: [...errors, ...newErrors],
  };
};

/**
 * Validate choices for an option value
 */
const validateChoices = (value: unknown, def: InternalOptionDef): ValidationError | undefined => {
  if (!def.choices || def.choices.length === 0) return undefined;

  if (!def.choices.includes(value)) {
    const choicesStr = def.choices.map((c) => `"${c}"`).join(", ");
    return {
      type: "validation_failed",
      message: `Invalid value "${value}" for --${def.name}. Must be one of: ${choicesStr}`,
      field: def.name,
    };
  }

  return undefined;
};

/**
 * Run choices and custom validators on options
 */
const runValidators = (
  options: ParsedOptions,
  definitions: InternalOptionDef[],
): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const def of definitions) {
    if (options[def.name] !== undefined) {
      // Validate choices first
      const choiceError = validateChoices(options[def.name], def);
      if (choiceError) {
        errors.push(choiceError);
        continue;
      }

      // Then run custom validators
      if (def.validate) {
        const result = def.validate(options[def.name]);
        if (result !== true) {
          errors.push({
            type: "validation_failed",
            message: `Invalid value for --${def.name}: ${result}`,
            field: def.name,
          });
        }
      }
    }
  }

  return errors;
};

/**
 * Parse options from tokens
 */
export function parseOptions(
  tokens: Token[],
  definitions: InternalOptionDef[],
  allowUnknown = false,
): {
  options: ParsedOptions;
  errors: ValidationError[];
  remaining: Token[];
} {
  const optionMap = buildOptionMap(definitions);
  const reducer = createOptionReducer(optionMap, allowUnknown, tokens);

  // Parse tokens
  const parsed = tokens.reduce(
    (state, token, index) => reducer(state, token, index),
    createInitialState(),
  );

  // Apply defaults for unseen options
  const withDefaults = applyDefaults(
    parsed.options,
    parsed.errors,
    definitions,
    parsed.seenOptions,
  );

  // Run validators
  const validationErrors = runValidators(withDefaults.options, definitions);

  return {
    options: withDefaults.options,
    errors: [...withDefaults.errors, ...validationErrors],
    remaining: parsed.remaining,
  };
}
