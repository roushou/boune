/**
 * Data formatting utilities
 */

/**
 * Format a table with columns
 *
 * @example
 * ```typescript
 * const output = table([
 *   ["Name", "Age"],
 *   ["Alice", "30"],
 *   ["Bob", "25"],
 * ]);
 * ```
 */
export function table(rows: string[][], options?: { padding?: number }): string {
  if (rows.length === 0) return "";

  const padding = options?.padding ?? 2;
  const colWidths: number[] = [];

  // Calculate column widths
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] ?? "";
      colWidths[i] = Math.max(colWidths[i] ?? 0, cell.length);
    }
  }

  // Format rows
  return rows
    .map((row) => row.map((cell, i) => cell.padEnd((colWidths[i] ?? 0) + padding)).join(""))
    .join("\n");
}

/**
 * Format a list with bullets
 *
 * @example
 * ```typescript
 * const output = list(["Item 1", "Item 2", "Item 3"]);
 * // • Item 1
 * // • Item 2
 * // • Item 3
 * ```
 */
export function list(items: string[], bullet = "•"): string {
  return items.map((item) => `${bullet} ${item}`).join("\n");
}

/**
 * Format key-value pairs
 *
 * @example
 * ```typescript
 * const output = keyValue({
 *   Name: "Alice",
 *   Age: "30",
 * });
 * // Name: Alice
 * // Age:  30
 * ```
 */
export function keyValue(pairs: Record<string, string>, separator = ":"): string {
  const maxKeyLen = Math.max(...Object.keys(pairs).map((k) => k.length));
  return Object.entries(pairs)
    .map(([key, value]) => `${key.padEnd(maxKeyLen)}${separator} ${value}`)
    .join("\n");
}
