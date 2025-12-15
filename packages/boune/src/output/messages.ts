/**
 * Status message formatters
 */

import { color } from "./color.ts";

/**
 * Format an error message
 */
export function error(message: string): string {
  return `${color.red("error:")} ${message}`;
}

/**
 * Format a warning message
 */
export function warning(message: string): string {
  return `${color.yellow("warning:")} ${message}`;
}

/**
 * Format a success message
 */
export function success(message: string): string {
  return `${color.green("success:")} ${message}`;
}

/**
 * Format an info message
 */
export function info(message: string): string {
  return `${color.blue("info:")} ${message}`;
}
