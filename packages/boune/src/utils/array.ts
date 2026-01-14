/**
 * Safe array access utilities
 *
 * These helpers provide bounds-checked array access that throws descriptive
 * errors when invariants are violated, rather than using non-null assertions.
 */

/**
 * Get an array element at the given index, throwing if out of bounds.
 * Use this when you expect the index to always be valid (indicates a bug if not).
 *
 * @example
 * ```typescript
 * const items = ['a', 'b', 'c'];
 * const item = at(items, 1); // 'b'
 * const bad = at(items, 5);  // throws Error
 * ```
 */
export function at<T>(array: readonly T[], index: number): T {
  if (index < 0 || index >= array.length) {
    throw new Error(`Array index ${index} out of bounds (length: ${array.length})`);
  }
  return array[index] as T;
}

/**
 * Get an array element at the given index, or undefined if out of bounds.
 * Use this when the index might legitimately be invalid.
 */
export function tryAt<T>(array: readonly T[], index: number): T | undefined {
  if (index < 0 || index >= array.length) {
    return undefined;
  }
  return array[index];
}
