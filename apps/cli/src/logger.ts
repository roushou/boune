import { color } from "boune";

let verboseEnabled = false;

export function setVerbose(enabled: boolean): void {
  verboseEnabled = enabled;
}

export function isVerbose(): boolean {
  return verboseEnabled;
}

export function debug(...args: unknown[]): void {
  if (verboseEnabled) {
    console.log(color.dim(`[debug]`), ...args);
  }
}

export function debugSection(title: string, data: Record<string, unknown>): void {
  if (!verboseEnabled) return;

  console.log(color.dim(`[debug] ${title}:`));
  for (const [key, value] of Object.entries(data)) {
    const formatted = typeof value === "object" ? JSON.stringify(value) : String(value);
    console.log(color.dim(`  ${key}: ${formatted}`));
  }
}
