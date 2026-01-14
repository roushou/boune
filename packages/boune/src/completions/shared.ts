import type { CommandConfig } from "../types/index.ts";

/**
 * Get visible (non-hidden) commands, deduplicating by reference
 */
export function getVisibleCommands(commands: Record<string, CommandConfig>): CommandConfig[] {
  const seen = new Set<CommandConfig>();
  const result: CommandConfig[] = [];

  for (const config of Object.values(commands)) {
    if (!seen.has(config) && !config.hidden) {
      seen.add(config);
      result.push(config);
    }
  }

  return result;
}
