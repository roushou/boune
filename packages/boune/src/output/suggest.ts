/**
 * Command suggestion utilities for autocomplete
 */

import type { CommandConfig } from "../types/index.ts";

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Create matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1, // deletion
        dp[i]![j - 1]! + 1, // insertion
        dp[i - 1]![j - 1]! + cost, // substitution
      );
    }
  }

  return dp[m]![n]!;
}

/**
 * Check if a string starts with another (prefix match)
 */
function isPrefixMatch(input: string, candidate: string): boolean {
  return candidate.toLowerCase().startsWith(input.toLowerCase());
}

/**
 * Calculate similarity score (0-1, higher is better)
 */
function similarity(input: string, candidate: string): number {
  const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase());
  const maxLen = Math.max(input.length, candidate.length);
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

  // Get unique commands (filter out aliases pointing to same config)
  const seen = new Set<CommandConfig>();
  const uniqueCommands: Array<{ name: string; config: CommandConfig }> = [];

  for (const [name, config] of Object.entries(commands)) {
    if (!seen.has(config) && !config.hidden) {
      seen.add(config);
      uniqueCommands.push({ name, config });
    }
  }

  // Calculate scores for each command
  const scored: Suggestion[] = [];

  for (const { name, config } of uniqueCommands) {
    // Prefix matches get a boost
    const prefixBoost = isPrefixMatch(input, name) ? 0.3 : 0;
    const score = similarity(input, name) + prefixBoost;

    if (score >= minScore) {
      scored.push({
        name,
        description: config.description,
        score,
      });
    }

    // Also check aliases
    for (const alias of config.aliases) {
      const aliasScore = similarity(input, alias) + (isPrefixMatch(input, alias) ? 0.3 : 0);
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
