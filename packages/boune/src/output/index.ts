// Color utilities
export { color, supportsColor } from "./color.ts";

// Data formatters
export { table, list, keyValue } from "./format.ts";

// Status messages
export { error, warning, success, info } from "./messages.ts";

// Progress indicators
export { createSpinner, type Spinner } from "./spinner.ts";
export { createProgressBar, type ProgressBar, type ProgressBarOptions } from "./progress.ts";
export { createDraft, type Draft, type DraftLine } from "./draft.ts";

// Help generation
export { generateCommandHelp, generateCliHelp } from "./help.ts";

// Command suggestions
export { levenshtein, suggestCommands, formatSuggestions, type Suggestion } from "./suggest.ts";
