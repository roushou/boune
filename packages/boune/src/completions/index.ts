export { generateBashCompletion } from "./bash.ts";
export { generateZshCompletion } from "./zsh.ts";
export { generateFishCompletion } from "./fish.ts";

export type ShellType = "bash" | "zsh" | "fish";

import type { CliConfig } from "../types/index.ts";
import { generateBashCompletion } from "./bash.ts";
import { generateZshCompletion } from "./zsh.ts";
import { generateFishCompletion } from "./fish.ts";

/**
 * Generate completion script for the specified shell
 */
export function generateCompletion(config: CliConfig, shell: ShellType): string {
  switch (shell) {
    case "bash":
      return generateBashCompletion(config);
    case "zsh":
      return generateZshCompletion(config);
    case "fish":
      return generateFishCompletion(config);
    default:
      const exhaustiveCheck: never = shell;
      throw new Error(`Unsupported shell: ${exhaustiveCheck}`);
  }
}
