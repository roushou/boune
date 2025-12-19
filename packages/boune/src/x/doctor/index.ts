import { color } from "../../output/color.ts";

export type CheckStatus = "ok" | "warn" | "error" | "skip";

export type CheckResult = {
  status: CheckStatus;
  message: string;
};

export type Check = {
  name: string;
  run: () => Promise<CheckResult> | CheckResult;
};

export type DoctorOptions = {
  /** Name of your CLI (used in output header) */
  name?: string;
  /** List of checks to run */
  checks: Check[];
  /** Stop on first error */
  failFast?: boolean;
};

export type DoctorResult = {
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
  checks: Array<{ name: string; result: CheckResult }>;
};

const STATUS_ICONS: Record<CheckStatus, string> = {
  ok: "✓",
  warn: "⚠",
  error: "✗",
  skip: "○",
};

function formatStatus(status: CheckStatus): string {
  const icon = STATUS_ICONS[status];
  switch (status) {
    case "ok":
      return color.green(icon);
    case "warn":
      return color.yellow(icon);
    case "error":
      return color.red(icon);
    case "skip":
      return color.gray(icon);
  }
}

/**
 * Create a diagnostic check
 *
 * @example
 * ```ts
 * const nodeCheck = check("Node.js version", async () => {
 *   const version = process.version;
 *   const major = parseInt(version.slice(1));
 *   if (major < 18) {
 *     return { status: "error", message: `Found ${version}, requires 18+` };
 *   }
 *   return { status: "ok", message: version };
 * });
 * ```
 */
export function check(name: string, run: Check["run"]): Check {
  return { name, run };
}

/**
 * Create a doctor instance for running diagnostic checks
 *
 * @example
 * ```ts
 * import { createDoctor, check, checks } from "boune/x/doctor";
 *
 * const doctor = createDoctor({
 *   name: "myapp",
 *   checks: [
 *     checks.bunVersion("1.0.0"),
 *     checks.commandExists("git"),
 *     check("API reachable", async () => {
 *       const res = await fetch("https://api.example.com/health");
 *       if (!res.ok) return { status: "error", message: "API unreachable" };
 *       return { status: "ok", message: "Connected" };
 *     }),
 *   ],
 * });
 *
 * const result = await doctor.run();
 * process.exit(result.failed > 0 ? 1 : 0);
 * ```
 */
export function createDoctor(options: DoctorOptions) {
  return {
    async run(): Promise<DoctorResult> {
      const results: DoctorResult = {
        passed: 0,
        warned: 0,
        failed: 0,
        skipped: 0,
        checks: [],
      };

      if (options.name) {
        console.log(color.bold(`\n${options.name} doctor\n`));
      }

      for (const c of options.checks) {
        let result: CheckResult;

        try {
          result = await c.run();
        } catch (err) {
          result = {
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          };
        }

        results.checks.push({ name: c.name, result });

        switch (result.status) {
          case "ok":
            results.passed++;
            break;
          case "warn":
            results.warned++;
            break;
          case "error":
            results.failed++;
            break;
          case "skip":
            results.skipped++;
            break;
        }

        const status = formatStatus(result.status);
        const message = result.message ? color.dim(` — ${result.message}`) : "";
        console.log(`  ${status} ${c.name}${message}`);

        if (options.failFast && result.status === "error") {
          break;
        }
      }

      // Summary
      console.log("");
      const parts: string[] = [];
      if (results.passed > 0) parts.push(color.green(`${results.passed} passed`));
      if (results.warned > 0) parts.push(color.yellow(`${results.warned} warnings`));
      if (results.failed > 0) parts.push(color.red(`${results.failed} failed`));
      if (results.skipped > 0) parts.push(color.gray(`${results.skipped} skipped`));
      console.log(`  ${parts.join(", ")}\n`);

      return results;
    },
  };
}

/**
 * Built-in common checks
 */
export const checks = {
  /**
   * Check Bun version meets minimum requirement
   */
  bunVersion: (minVersion: string): Check =>
    check("Bun version", () => {
      const version = Bun.version;
      if (compareVersions(version, minVersion) < 0) {
        return {
          status: "error",
          message: `Found ${version}, requires ${minVersion}+`,
        };
      }
      return { status: "ok", message: version };
    }),

  /**
   * Check if a command exists in PATH
   */
  commandExists: (command: string): Check =>
    check(`${command} installed`, async () => {
      try {
        const proc = Bun.spawn(["which", command], {
          stdout: "pipe",
          stderr: "ignore",
        });
        const exitCode = await proc.exited;
        if (exitCode === 0) {
          const path = await new Response(proc.stdout).text();
          return { status: "ok", message: path.trim() };
        }
        return { status: "error", message: "Not found in PATH" };
      } catch {
        return { status: "error", message: "Not found" };
      }
    }),

  /**
   * Check if a file exists
   */
  fileExists: (path: string, options?: { required?: boolean }): Check =>
    check(`File exists: ${path}`, async () => {
      const file = Bun.file(path);
      const exists = await file.exists();
      if (exists) {
        return { status: "ok", message: "Found" };
      }
      return {
        status: options?.required ? "error" : "warn",
        message: "Not found",
      };
    }),

  /**
   * Check if an environment variable is set
   */
  envVar: (name: string, options?: { required?: boolean }): Check =>
    check(`Env: ${name}`, () => {
      const value = process.env[name];
      if (value) {
        // Mask sensitive values
        const masked = value.length > 4 ? `${value.slice(0, 2)}...${value.slice(-2)}` : "***";
        return { status: "ok", message: masked };
      }
      return {
        status: options?.required ? "error" : "warn",
        message: "Not set",
      };
    }),

  /**
   * Check if a URL is reachable
   */
  urlReachable: (url: string, options?: { timeout?: number }): Check =>
    check(`URL reachable: ${new URL(url).host}`, async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options?.timeout ?? 5000);

        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          return { status: "ok", message: `${response.status}` };
        }
        return { status: "warn", message: `HTTP ${response.status}` };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return { status: "error", message: "Timeout" };
        }
        return { status: "error", message: "Unreachable" };
      }
    }),

  /**
   * Check available disk space
   */
  diskSpace: (path: string, minMB: number): Check =>
    check(`Disk space: ${path}`, async () => {
      try {
        const proc = Bun.spawn(["df", "-m", path], {
          stdout: "pipe",
          stderr: "ignore",
        });
        const output = await new Response(proc.stdout).text();
        const lines = output.trim().split("\n");
        if (lines.length < 2) {
          return { status: "warn", message: "Could not determine" };
        }
        const parts = lines[1].split(/\s+/);
        const available = parseInt(parts[3], 10);
        if (isNaN(available)) {
          return { status: "warn", message: "Could not parse" };
        }
        if (available < minMB) {
          return {
            status: "error",
            message: `${available}MB available, need ${minMB}MB`,
          };
        }
        return { status: "ok", message: `${available}MB available` };
      } catch {
        return { status: "warn", message: "Could not check" };
      }
    }),
};

function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(a);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}
