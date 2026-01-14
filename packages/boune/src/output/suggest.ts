/**
 * Command suggestion utilities for autocomplete
 */

import type { CommandConfig } from "../types/index.ts";

/**
 * Calculate Levenshtein distance between two strings
 * Optimized to use O(min(m,n)) space instead of O(m*n)
 */
export function levenshtein(a: string, b: string): number {
  // Ensure 'a' is the shorter string for minimal memory usage
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const m = a.length;
  const n = b.length;

  // Edge cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows instead of full matrix: previous and current
  let prev = Array.from<number>({ length: m + 1 });
  let curr = Array.from<number>({ length: m + 1 });

  // Initialize first row
  for (let i = 0; i <= m; i++) {
    prev[i] = i;
  }

  // Fill row by row
  for (let j = 1; j <= n; j++) {
    curr[0] = j;

    for (let i = 1; i <= m; i++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[i] = Math.min(
        (prev[i] as number) + 1, // deletion
        (curr[i - 1] as number) + 1, // insertion
        (prev[i - 1] as number) + cost, // substitution
      );
    }

    // Swap rows
    [prev, curr] = [curr, prev];
  }

  // Result is in prev (due to final swap)
  return prev[m] as number;
}

/**
 * Check if a string starts with another (prefix match)
 * Accepts pre-lowercased strings for efficiency
 */
function isPrefixMatch(inputLower: string, candidateLower: string): boolean {
  return candidateLower.startsWith(inputLower);
}

/**
 * Calculate similarity score (0-1, higher is better)
 * Accepts pre-lowercased strings for efficiency
 */
function similarity(inputLower: string, candidateLower: string): number {
  const distance = levenshtein(inputLower, candidateLower);
  const maxLen = Math.max(inputLower.length, candidateLower.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export interface Suggestion {
  name: string;
  description: string;
  score: number;
}

/**
 * Get command suggestions based on input
 */
export function suggestCommands(
  input: string,
  commands: Record<string, CommandConfig>,
  options?: {
    /** Maximum number of suggestions to return (default: 3) */
    maxSuggestions?: number;
    /** Minimum similarity score to include (default: 0.4) */
    minScore?: number;
  },
): Suggestion[] {
  const { maxSuggestions = 3, minScore = 0.4 } = options ?? {};

  // Pre-compute lowercase input once
  const inputLower = input.toLowerCase();

  // Get unique commands (filter out aliases pointing to same config)
  const seen = new Set<CommandConfig>();
  const uniqueCommands: Array<{ name: string; nameLower: string; config: CommandConfig }> = [];

  for (const [name, config] of Object.entries(commands)) {
    if (!seen.has(config) && !config.hidden) {
      seen.add(config);
      uniqueCommands.push({ name, nameLower: name.toLowerCase(), config });
    }
  }

  // Calculate scores for each command
  const scored: Suggestion[] = [];

  for (const { name, nameLower, config } of uniqueCommands) {
    // Prefix matches get a boost
    const prefixBoost = isPrefixMatch(inputLower, nameLower) ? 0.3 : 0;
    const score = similarity(inputLower, nameLower) + prefixBoost;

    if (score >= minScore) {
      scored.push({
        name,
        description: config.description,
        score,
      });
    }

    // Also check aliases
    for (const alias of config.aliases) {
      const aliasLower = alias.toLowerCase();
      const aliasScore =
        similarity(inputLower, aliasLower) + (isPrefixMatch(inputLower, aliasLower) ? 0.3 : 0);
      if (aliasScore >= minScore && aliasScore > score) {
        // Only add alias if it's a better match than the main name
        const existing = scored.find((s) => s.name === name);
        if (existing) {
          existing.score = Math.max(existing.score, aliasScore);
        }
      }
    }
  }

  // Sort by score (descending) and return top matches
  return scored.sort((a, b) => b.score - a.score).slice(0, maxSuggestions);
}

/**
 * Format suggestions for display
 */
export function formatSuggestions(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) return "";

  const lines = ["", "Did you mean one of these?", ""];

  // Calculate max name length for alignment
  const maxNameLen = Math.max(...suggestions.map((s) => s.name.length));

  for (const suggestion of suggestions) {
    const paddedName = suggestion.name.padEnd(maxNameLen + 2);
    lines.push(`    ${paddedName}${suggestion.description}`);
  }

  lines.push("");
  return lines.join("\n");
}
