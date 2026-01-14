import type { CliConfig } from "../types/index.ts";
import { generateBashCompletion } from "./bash.ts";
import { generateFishCompletion } from "./fish.ts";
import { generateZshCompletion } from "./zsh.ts";

export { generateBashCompletion } from "./bash.ts";
export { generateFishCompletion } from "./fish.ts";
export { generateZshCompletion } from "./zsh.ts";

export type ShellType = "bash" | "zsh" | "fish";

/**
 * Registry of shell completion generators
 */
const completionGenerators: Record<ShellType, (config: CliConfig) => string> = {
  bash: generateBashCompletion,
  zsh: generateZshCompletion,
  fish: generateFishCompletion,
};

/**
 * Generate completion script for the specified shell
 */
export function generateCompletion(config: CliConfig, shell: ShellType): string {
  const generator = completionGenerators[shell];
  if (!generator) {
    throw new Error(`Unsupported shell: ${String(shell)}`);
  }
  return generator(config);
}
