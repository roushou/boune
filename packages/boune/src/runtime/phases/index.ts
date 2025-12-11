/**
 * Pipeline phases exports
 */

export type { Phase, PhaseResult, PipelineContext } from "./types.ts";
export { createInitialContext } from "./types.ts";

export { tokenizePhase } from "./tokenize.ts";
export { parseGlobalOptionsPhase } from "./global-options.ts";
export { handleVersionPhase, handleRootHelpPhase, handleCommandHelpPhase } from "./help.ts";
export {
  extractCommandPathPhase,
  handleNoCommandPhase,
  resolveCommandPhase,
} from "./command-resolution.ts";
export { parseCommandOptionsPhase, parseArgumentsPhase } from "./parse.ts";
export { validatePhase, checkActionPhase } from "./validate.ts";

import type { Phase } from "./types.ts";
import { tokenizePhase } from "./tokenize.ts";
import { parseGlobalOptionsPhase } from "./global-options.ts";
import { handleVersionPhase, handleRootHelpPhase, handleCommandHelpPhase } from "./help.ts";
import {
  extractCommandPathPhase,
  handleNoCommandPhase,
  resolveCommandPhase,
} from "./command-resolution.ts";
import { parseCommandOptionsPhase, parseArgumentsPhase } from "./parse.ts";
import { validatePhase, checkActionPhase } from "./validate.ts";

/**
 * All pipeline phases in order
 */
export const phases: Phase[] = [
  tokenizePhase,
  parseGlobalOptionsPhase,
  handleVersionPhase,
  extractCommandPathPhase,
  handleRootHelpPhase,
  handleNoCommandPhase,
  resolveCommandPhase,
  handleCommandHelpPhase,
  parseCommandOptionsPhase,
  parseArgumentsPhase,
  validatePhase,
  checkActionPhase,
];
