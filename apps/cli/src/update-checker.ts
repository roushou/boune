import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CACHE_FILE = join(homedir(), ".cache", "boune", "update-check.json");
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const NPM_REGISTRY = "https://registry.npmjs.org/boune";

interface UpdateInfo {
  latest: string;
  current: string;
}

interface CacheData {
  lastCheck: number;
  latestVersion: string | null;
}

async function readCache(): Promise<CacheData | null> {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const content = await Bun.file(CACHE_FILE).text();
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function writeCache(data: CacheData): Promise<void> {
  try {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(homedir(), ".cache", "boune"), { recursive: true });
    await Bun.write(CACHE_FILE, JSON.stringify(data));
  } catch {
    // Ignore cache write errors
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(NPM_REGISTRY, {
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
 * Check for updates (non-blocking, cached for 24 hours)
 * Returns update info if a newer version is available, null otherwise
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo | null> {
  try {
    // Check cache first
    const cache = await readCache();
    const now = Date.now();

    if (cache && now - cache.lastCheck < CHECK_INTERVAL_MS) {
      // Use cached result
      if (cache.latestVersion && compareVersions(currentVersion, cache.latestVersion)) {
        return { latest: cache.latestVersion, current: currentVersion };
      }
      return null;
    }

    // Fetch latest version
    const latestVersion = await fetchLatestVersion();

    // Update cache
    await writeCache({
      lastCheck: now,
      latestVersion,
    });

    if (latestVersion && compareVersions(currentVersion, latestVersion)) {
      return { latest: latestVersion, current: currentVersion };
    }

    return null;
  } catch {
    // Never fail the CLI due to update check
    return null;
  }
}
