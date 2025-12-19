import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

const DEFAULT_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_REGISTRY = "https://registry.npmjs.org";

export type UpdateCheckerOptions = {
  /** The npm package name to check */
  packageName: string;
  /** The current version of your CLI */
  currentVersion: string;
  /** Custom cache directory. Defaults to ~/.cache/{packageName} */
  cacheDir?: string;
  /** Check interval in milliseconds. Defaults to 24 hours */
  checkInterval?: number;
  /** Custom npm registry URL. Defaults to https://registry.npmjs.org */
  registryUrl?: string;
  /** Request timeout in milliseconds. Defaults to 3000 */
  timeout?: number;
};

export type UpdateInfo = {
  latest: string;
  current: string;
};

type CacheData = {
  lastCheck: number;
  latestVersion: string | null;
};

function getCacheFile(options: UpdateCheckerOptions): string {
  const cacheDir = options.cacheDir ?? join(homedir(), ".cache", options.packageName);
  return join(cacheDir, "update-check.json");
}

async function readCache(cacheFile: string): Promise<CacheData | null> {
  try {
    if (!existsSync(cacheFile)) return null;
    const content = await Bun.file(cacheFile).text();
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function writeCache(cacheFile: string, data: CacheData): Promise<void> {
  try {
    const dir = join(cacheFile, "..");
    await mkdir(dir, { recursive: true });
    await Bun.write(cacheFile, JSON.stringify(data));
  } catch {
    // Ignore cache write errors
  }
}

async function fetchLatestVersion(options: UpdateCheckerOptions): Promise<string | null> {
  try {
    const registryUrl = options.registryUrl ?? DEFAULT_REGISTRY;
    const url = `${registryUrl}/${options.packageName}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout ?? 3000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as { "dist-tags"?: { latest?: string } };
    return data["dist-tags"]?.latest ?? null;
  } catch {
    return null;
  }
}

function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [currMajor = 0, currMinor = 0, currPatch = 0] = parse(current);
  const [latestMajor = 0, latestMinor = 0, latestPatch = 0] = parse(latest);

  if (latestMajor > currMajor) return true;
  if (latestMajor === currMajor && latestMinor > currMinor) return true;
  if (latestMajor === currMajor && latestMinor === currMinor && latestPatch > currPatch)
    return true;
  return false;
}

/**
 * Check for updates (non-blocking, cached)
 * Returns update info if a newer version is available, null otherwise
 *
 * @example
 * ```ts
 * import { checkForUpdates } from "boune/x/update-checker";
 *
 * const update = await checkForUpdates({
 *   packageName: "my-cli",
 *   currentVersion: "1.0.0",
 * });
 *
 * if (update) {
 *   console.log(`Update available: ${update.current} → ${update.latest}`);
 * }
 * ```
 */
export async function checkForUpdates(options: UpdateCheckerOptions): Promise<UpdateInfo | null> {
  try {
    const cacheFile = getCacheFile(options);
    const checkInterval = options.checkInterval ?? DEFAULT_CHECK_INTERVAL_MS;

    // Check cache first
    const cache = await readCache(cacheFile);
    const now = Date.now();

    if (cache && now - cache.lastCheck < checkInterval) {
      // Use cached result
      if (cache.latestVersion && compareVersions(options.currentVersion, cache.latestVersion)) {
        return { latest: cache.latestVersion, current: options.currentVersion };
      }
      return null;
    }

    // Fetch latest version
    const latestVersion = await fetchLatestVersion(options);

    // Update cache
    await writeCache(cacheFile, {
      lastCheck: now,
      latestVersion,
    });

    if (latestVersion && compareVersions(options.currentVersion, latestVersion)) {
      return { latest: latestVersion, current: options.currentVersion };
    }

    return null;
  } catch {
    // Never fail the CLI due to update check
    return null;
  }
}
