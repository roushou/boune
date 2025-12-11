import type { Token } from "../types/index.ts";

/**
 * Token pattern matcher definition
 */
type TokenPattern = {
  match: string | RegExp;
  emit: (groups: RegExpMatchArray | null, raw: string) => Token[];
};

/**
 * Declarative token patterns - order matters, first match wins
 */
const tokenPatterns: TokenPattern[] = [
  // -- separator
  {
    match: "--",
    emit: (_, raw) => [{ type: "separator", value: "--", raw }],
  },
  // Long option with value: --name=value
  {
    match: /^--([^=]+)=(.+)$/,
    emit: (m, raw) => [
      { type: "option", value: m![1]!, raw },
      { type: "value", value: m![2]!, raw: m![2]! },
    ],
  },
  // Long option: --name
  {
    match: /^--(.+)$/,
    emit: (m, raw) => [{ type: "option", value: m![1]!, raw }],
  },
  // Short option with value: -n=value (last flag gets value)
  {
    match: /^-([^=]+)=(.+)$/,
    emit: (m, _raw) => {
      const flags = m![1]!;
      const value = m![2]!;
      const tokens: Token[] = [];
      // All flags except last are standalone
      for (let i = 0; i < flags.length - 1; i++) {
        tokens.push({ type: "option", value: flags[i]!, raw: `-${flags[i]}` });
      }
      // Last flag gets the value
      tokens.push({
        type: "option",
        value: flags[flags.length - 1]!,
        raw: `-${flags[flags.length - 1]}`,
      });
      tokens.push({ type: "value", value, raw: value });
      return tokens;
    },
  },
  // Short options: -abc expands to -a -b -c
  {
    match: /^-(.+)$/,
    emit: (m, _raw) =>
      m![1]!.split("").map((flag) => ({
        type: "option" as const,
        value: flag,
        raw: `-${flag}`,
      })),
  },
  // Everything else is an argument
  {
    match: /.*/,
    emit: (_, raw) => [{ type: "argument", value: raw, raw }],
  },
];

/**
 * Match a single argument against patterns
 */
const matchArg = (arg: string): Token[] => {
  for (const { match, emit } of tokenPatterns) {
    if (typeof match === "string") {
      if (arg === match) return emit(null, arg);
    } else {
      const result = arg.match(match);
      if (result) return emit(result, arg);
    }
  }
  return [{ type: "argument", value: arg, raw: arg }];
};

/**
 * Tokenizer state for handling separator
 */
type TokenizerState = {
  tokens: Token[];
  afterSeparator: boolean;
};

/**
 * Reduce a single argument into tokenizer state
 */
const tokenizeReducer = (state: TokenizerState, arg: string): TokenizerState => {
  // After separator, everything is an argument
  if (state.afterSeparator) {
    return {
      ...state,
      tokens: [...state.tokens, { type: "argument", value: arg, raw: arg }],
    };
  }

  const newTokens = matchArg(arg);
  const hasSeparator = newTokens.some((t) => t.type === "separator");

  return {
    tokens: [...state.tokens, ...newTokens],
    afterSeparator: hasSeparator,
  };
};

/**
 * Tokenizes raw argv into structured tokens
 */
export function tokenize(argv: string[]): Token[] {
  const initial: TokenizerState = { tokens: [], afterSeparator: false };
  return argv.reduce(tokenizeReducer, initial).tokens;
}

/**
 * Check if a token looks like a negative number rather than a flag
 */
export function isNegativeNumber(value: string): boolean {
  return /^-\d+(\.\d+)?$/.test(value);
}
