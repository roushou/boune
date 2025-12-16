export type { BouneConfig, ProfileConfig, ResolvedConfig } from "./types.ts";
export { DEFAULT_CONFIG } from "./types.ts";
export {
  loadConfig,
  getAvailableProfiles,
  resolveAlias,
  type LoadConfigOptions,
} from "./loader.ts";
