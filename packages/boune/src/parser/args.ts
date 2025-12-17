import type { InternalArgumentDef, Kind, ParsedArgs, ValidationError } from "../types/index.ts";

/**
 * Result type for coercion operations
 */
type CoerceResult = { ok: true; value: unknown } | { ok: false; error: string };

/**
 * Coercer function type
 */
type Coercer = (value: string) => CoerceResult;

/**
 * Boolean truthy/falsy value mappings
 */
const booleanMap: Record<string, boolean> = {
  true: true,
  "1": true,
  yes: true,
  false: false,
  "0": false,
  no: false,
};

/**
 * Declarative coercers for each type
 */
const coercers: Record<Kind, Coercer> = {
  string: (value) => ({ ok: true, value }),

  number: (value) => {
    const num = Number(value);
    return Number.isNaN(num)
      ? { ok: false, error: `"${value}" is not a valid number` }
      : { ok: true, value: num };
  },

  boolean: (value) => {
    const result = booleanMap[value.toLowerCase()];
    return result !== undefined
      ? { ok: true, value: result }
      : { ok: false, error: `"${value}" is not a valid boolean` };
  },
};

/**
 * Coerce a string value to the specified type
 */
export function coerceValue(value: string, type: Kind): CoerceResult {
  const coercer = coercers[type];
  if (!coercer) {
    return { ok: false, error: `Unknown type: ${type}` };
  }
  return coercer(value);
}

/**
 * Parsed argument result
 */
type ArgParseResult = {
  name: string;
  value: unknown;
  error?: ValidationError;
  consumed: number;
};

/**
 * Parse a single variadic argument definition
 */
const parseVariadicArg = (
  def: InternalArgumentDef,
  values: string[],
  startIndex: number,
): ArgParseResult => {
  const remaining = values.slice(startIndex);

  if (remaining.length === 0 && def.required) {
    return {
      name: def.name,
      value: def.default ?? [],
      error: {
        type: "missing_required",
        message: `Missing required argument: <${def.name}>`,
        field: def.name,
      },
      consumed: 0,
    };
  }

  const results = remaining.map((val) => coerceValue(val, def.type));
  const errors = results.filter((r): r is { ok: false; error: string } => !r.ok);
  const coerced = results
    .filter((r): r is { ok: true; value: unknown } => r.ok)
    .map((r) => r.value);

  return {
    name: def.name,
    value: coerced.length > 0 ? coerced : (def.default ?? []),
    error:
      errors.length > 0
        ? {
            type: "invalid_type",
            message: `Invalid value for <${def.name}>: ${errors[0]!.error}`,
            field: def.name,
          }
        : undefined,
    consumed: remaining.length,
  };
};

/**
 * Parse a single non-variadic argument definition
 */
const parseSingleArg = (def: InternalArgumentDef, value: string | undefined): ArgParseResult => {
  if (value === undefined) {
    return {
      name: def.name,
      value: def.default,
      error: def.required
        ? {
            type: "missing_required",
            message: `Missing required argument: <${def.name}>`,
            field: def.name,
          }
        : undefined,
      consumed: 0,
    };
  }

  const result = coerceValue(value, def.type);
  return {
    name: def.name,
    value: result.ok ? result.value : def.default,
    error: result.ok
      ? undefined
      : {
          type: "invalid_type",
          message: `Invalid value for <${def.name}>: ${result.error}`,
          field: def.name,
        },
    consumed: 1,
  };
};

/**
 * Validate choices for an argument value
 */
const validateChoices = (value: unknown, def: InternalArgumentDef): ValidationError | undefined => {
  if (!def.choices || def.choices.length === 0) return undefined;

  if (def.variadic && Array.isArray(value)) {
    for (const v of value) {
      if (!def.choices.includes(v)) {
        const choicesStr = def.choices.map((c) => `"${c}"`).join(", ");
        return {
          type: "validation_failed",
          message: `Invalid value "${v}" for <${def.name}>. Must be one of: ${choicesStr}`,
          field: def.name,
        };
      }
    }
  } else if (!def.choices.includes(value)) {
    const choicesStr = def.choices.map((c) => `"${c}"`).join(", ");
    return {
      type: "validation_failed",
      message: `Invalid value "${value}" for <${def.name}>. Must be one of: ${choicesStr}`,
      field: def.name,
    };
  }

  return undefined;
};

/**
 * Run choices and custom validation on parsed arguments
 */
const runValidators = (args: ParsedArgs, definitions: InternalArgumentDef[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const def of definitions) {
    if (args[def.name] !== undefined) {
      // Validate choices first
      const choiceError = validateChoices(args[def.name], def);
      if (choiceError) {
        errors.push(choiceError);
        continue;
      }

      // Then run custom validators
      if (def.validate) {
        const result = def.validate(args[def.name]);
        if (result !== true) {
          errors.push({
            type: "validation_failed",
            message: `Invalid value for <${def.name}>: ${result}`,
            field: def.name,
          });
        }
      }
    }
  }

  return errors;
};

/**
 * Argument parsing state
 */
type ArgParseState = {
  args: ParsedArgs;
  errors: ValidationError[];
  valueIndex: number;
};

/**
 * Reducer for parsing argument definitions
 */
const argReducer =
  (values: string[]) =>
  (state: ArgParseState, def: InternalArgumentDef): ArgParseState => {
    const result = def.variadic
      ? parseVariadicArg(def, values, state.valueIndex)
      : parseSingleArg(def, values[state.valueIndex]);

    return {
      args: { ...state.args, [result.name]: result.value },
      errors: result.error ? [...state.errors, result.error] : state.errors,
      valueIndex: def.variadic ? values.length : state.valueIndex + result.consumed,
    };
  };

/**
 * Parse positional arguments according to argument definitions
 */
export function parseArguments(
  values: string[],
  definitions: InternalArgumentDef[],
): { args: ParsedArgs; errors: ValidationError[] } {
  const initial: ArgParseState = { args: {}, errors: [], valueIndex: 0 };
  const parsed = definitions.reduce(argReducer(values), initial);
  const validationErrors = runValidators(parsed.args, definitions);

  return {
    args: parsed.args,
    errors: [...parsed.errors, ...validationErrors],
  };
}
