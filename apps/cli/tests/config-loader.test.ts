import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getAvailableProfiles, loadConfig, resolveAlias } from "../src/config/index.ts";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type { BouneConfig } from "../src/config/index.ts";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("loadConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "boune-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("returns default config when no config file exists", async () => {
    const config = await loadConfig({ cwd: tempDir, skipGlobal: true });

    expect(config.source).toBe("default");
    expect(config.defaults?.verbose).toBe(false);
    expect(config.defaults?.color).toBe("auto");
    expect(config.defaults?.output).toBe("table");
    expect(config.defaults?.timeout).toBe(30000);
  });

  test("loads .bounerc.json config file", async () => {
    const configContent: BouneConfig = {
      defaults: {
        verbose: true,
        color: "always",
      },
      aliases: {
        d: "deploy --env=dev",
      },
    };

    await writeFile(join(tempDir, ".bounerc.json"), JSON.stringify(configContent));

    const config = await loadConfig({ cwd: tempDir, skipGlobal: true });

    expect(config.source).toBe(join(tempDir, ".bounerc.json"));
    expect(config.defaults?.verbose).toBe(true);
    expect(config.defaults?.color).toBe("always");
    expect(config.aliases?.d).toBe("deploy --env=dev");
  });

  test("loads .bounerc config file (no extension)", async () => {
    const configContent: BouneConfig = {
      defaults: { verbose: true },
    };

    await writeFile(join(tempDir, ".bounerc"), JSON.stringify(configContent));

    const config = await loadConfig({ cwd: tempDir, skipGlobal: true });

    expect(config.source).toBe(join(tempDir, ".bounerc"));
    expect(config.defaults?.verbose).toBe(true);
  });

  test("merges config with defaults", async () => {
    const configContent: BouneConfig = {
      defaults: {
        verbose: true,
        // color not specified, should use default
      },
    };

    await writeFile(join(tempDir, ".bounerc.json"), JSON.stringify(configContent));

    const config = await loadConfig({ cwd: tempDir, skipGlobal: true });

    expect(config.defaults?.verbose).toBe(true);
    expect(config.defaults?.color).toBe("auto"); // default value
    expect(config.defaults?.output).toBe("table"); // default value
  });

  test("walks up directories to find config", async () => {
    const nestedDir = join(tempDir, "a", "b", "c");
    await mkdir(nestedDir, { recursive: true });

    const configContent: BouneConfig = {
      defaults: { verbose: true },
    };

    await writeFile(join(tempDir, ".bounerc.json"), JSON.stringify(configContent));

    const config = await loadConfig({ cwd: nestedDir, skipGlobal: true });

    expect(config.source).toBe(join(tempDir, ".bounerc.json"));
    expect(config.defaults?.verbose).toBe(true);
  });

  test("prefers boune.config.ts over .bounerc.json", async () => {
    // Create both files - boune.config.ts should be preferred (first in list)
    await writeFile(
      join(tempDir, ".bounerc.json"),
      JSON.stringify({ defaults: { verbose: false } }),
    );

    // For .ts files, we need to use dynamic import which is harder to test
    // So we test the order with .bounerc.json vs .bounerc
    await writeFile(join(tempDir, ".bounerc"), JSON.stringify({ defaults: { verbose: true } }));

    const config = await loadConfig({ cwd: tempDir, skipGlobal: true });

    // .bounerc.json comes before .bounerc in the list
    expect(config.source).toBe(join(tempDir, ".bounerc.json"));
  });
});

describe("profile resolution", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "boune-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("applies profile defaults", async () => {
    const configContent: BouneConfig = {
      defaults: {
        verbose: false,
        color: "auto",
      },
      profiles: {
        dev: {
          defaults: {
            verbose: true,
          },
        },
      },
    };

    await writeFile(join(tempDir, ".bounerc.json"), JSON.stringify(configContent));

    const config = await loadConfig({ cwd: tempDir, profile: "dev", skipGlobal: true });

    expect(config.activeProfile).toBe("dev");
    expect(config.defaults?.verbose).toBe(true);
    expect(config.defaults?.color).toBe("auto"); // not overridden
  });

  test("applies profile command overrides", async () => {
    const configContent: BouneConfig = {
      commands: {
        deploy: { target: "staging" },
      },
      profiles: {
        prod: {
          commands: {
            deploy: { target: "production", confirm: true },
          },
        },
      },
    };

    await writeFile(join(tempDir, ".bounerc.json"), JSON.stringify(configContent));

    const config = await loadConfig({ cwd: tempDir, profile: "prod", skipGlobal: true });

    expect(config.activeProfile).toBe("prod");
    expect(config.commands?.deploy).toEqual({ target: "production", confirm: true });
  });

  test("sets environment variables from profile", async () => {
    const configContent: BouneConfig = {
      profiles: {
        prod: {
          env: {
            NODE_ENV: "production",
            DEBUG: "false",
          },
        },
      },
    };

    await writeFile(join(tempDir, ".bounerc.json"), JSON.stringify(configContent));

    // Clear env vars first
    delete process.env.NODE_ENV;
    delete process.env.DEBUG;

    await loadConfig({ cwd: tempDir, profile: "prod", skipGlobal: true });

    expect(process.env.NODE_ENV).toBe("production");
    expect(process.env.DEBUG).toBe("false");

    // Clean up
    delete process.env.NODE_ENV;
    delete process.env.DEBUG;
  });

  test("ignores non-existent profile", async () => {
    const configContent: BouneConfig = {
      defaults: { verbose: false },
      profiles: {
        dev: { defaults: { verbose: true } },
      },
    };

    await writeFile(join(tempDir, ".bounerc.json"), JSON.stringify(configContent));

    const config = await loadConfig({ cwd: tempDir, profile: "nonexistent", skipGlobal: true });

    expect(config.activeProfile).toBeUndefined();
    expect(config.defaults?.verbose).toBe(false);
  });

  test("getAvailableProfiles returns profile names", async () => {
    const configContent: BouneConfig = {
      profiles: {
        dev: { defaults: {} },
        staging: { defaults: {} },
        prod: { defaults: {} },
      },
    };

    await writeFile(join(tempDir, ".bounerc.json"), JSON.stringify(configContent));

    const config = await loadConfig({ cwd: tempDir, skipGlobal: true });
    const profiles = getAvailableProfiles(config);

    expect(profiles).toContain("dev");
    expect(profiles).toContain("staging");
    expect(profiles).toContain("prod");
    expect(profiles).toHaveLength(3);
  });

  test("getAvailableProfiles returns empty array when no profiles", async () => {
    const config = await loadConfig({ cwd: tempDir, skipGlobal: true });
    const profiles = getAvailableProfiles(config);

    expect(profiles).toEqual([]);
  });
});

describe("alias resolution", () => {
  test("resolves existing alias", () => {
    const config: BouneConfig = {
      aliases: {
        d: "deploy --env=dev",
        p: "deploy --env=prod",
      },
    };

    expect(resolveAlias(config, "d")).toBe("deploy --env=dev");
    expect(resolveAlias(config, "p")).toBe("deploy --env=prod");
  });

  test("returns null for non-existent alias", () => {
    const config: BouneConfig = {
      aliases: {
        d: "deploy --env=dev",
      },
    };

    expect(resolveAlias(config, "x")).toBeNull();
  });

  test("returns null when no aliases defined", () => {
    const config: BouneConfig = {};

    expect(resolveAlias(config, "d")).toBeNull();
  });
});
