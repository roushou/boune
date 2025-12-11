import type { ArgumentDef, Kind, ParsedArgs, ValidationError } from "../types/index.ts";

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
  def: ArgumentDef,
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
const parseSingleArg = (def: ArgumentDef, value: string | undefined): ArgParseResult => {
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
 * Run custom validation on parsed arguments
 */
const runValidators = (args: ParsedArgs, definitions: ArgumentDef[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const def of definitions) {
    if (args[def.name] !== undefined && def.validate) {
      const result = def.validate.validate(args[def.name]);
      if (result !== true) {
        errors.push({
          type: "validation_failed",
          message: `Invalid value for <${def.name}>: ${result}`,
          field: def.name,
        });
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
  (state: ArgParseState, def: ArgumentDef): ArgParseState => {
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
  definitions: ArgumentDef[],
): { args: ParsedArgs; errors: ValidationError[] } {
  const initial: ArgParseState = { args: {}, errors: [], valueIndex: 0 };
  const parsed = definitions.reduce(argReducer(values), initial);
  const validationErrors = runValidators(parsed.args, definitions);

  return {
    args: parsed.args,
    errors: [...parsed.errors, ...validationErrors],
  };
}
