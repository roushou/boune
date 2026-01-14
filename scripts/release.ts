#!/usr/bin/env bun

import { defineCli, defineCommand } from "../packages/boune/src/index.ts";
import { formatError, formatInfo, formatSuccess } from "../packages/boune/src/x/logger/index.ts";
import bouneJsrPkg from "../packages/boune/jsr.json";
import bounePkg from "../packages/boune/package.json";
import cliPkg from "../apps/cli/package.json";
import { confirm } from "../packages/boune/src/prompt/index.ts";
import createBouneJsrPkg from "../packages/create-boune/jsr.json";
import createBounePkg from "../packages/create-boune/package.json";

// ============================================================================
// Types
// ============================================================================

type BumpType = "patch" | "minor" | "major";

type PublishTarget = "npm" | "jsr";

type Package = {
  name: string;
  dir: string;
  npmName: string;
  jsrName: string | null;
  version: string;
};

type ReleaseTask = {
  name: string;
  run: () => Promise<boolean>;
};

type ReleasePlan = {
  packages: Array<{ pkg: Package; newVersion: string }>;
  tasks: ReleaseTask[];
};

// ============================================================================
// Package Registry
// ============================================================================

const PACKAGES: Package[] = [
  {
    name: "boune",
    dir: "packages/boune",
    npmName: bounePkg.name,
    jsrName: bouneJsrPkg.name,
    version: bounePkg.version,
  },
  {
    name: "create-boune",
    dir: "packages/create-boune",
    npmName: createBounePkg.name,
    jsrName: createBouneJsrPkg.name,
    version: createBounePkg.version,
  },
  {
    name: "cli",
    dir: "apps/cli",
    npmName: cliPkg.name,
    jsrName: null, // CLI is npm-only
    version: cliPkg.version,
  },
];

// ============================================================================
// Version Utilities
// ============================================================================

function bumpVersion(version: string, type: BumpType): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver version: "${version}"`);
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

// ============================================================================
// Release Operations
// ============================================================================

async function updateVersion(pkg: Package, newVersion: string, dryRun: boolean): Promise<boolean> {
  if (dryRun) {
    return true;
  }

  const write = (path: string, data: unknown) =>
    Bun.write(path, JSON.stringify(data, null, 2) + "\n");

  const pkgJsonPath = `${pkg.dir}/package.json`;
  const pkgJson = await Bun.file(pkgJsonPath).json();
  pkgJson.version = newVersion;
  await write(pkgJsonPath, pkgJson);

  // Only update jsr.json if the package has a jsrName
  if (pkg.jsrName) {
    const jsrJsonPath = `${pkg.dir}/jsr.json`;
    const jsrJson = await Bun.file(jsrJsonPath).json();
    jsrJson.version = newVersion;
    await write(jsrJsonPath, jsrJson);
  }

  // When boune is bumped, update dependent packages
  if (pkg.name === "boune") {
    const dependentPaths = ["packages/create-boune/package.json", "apps/cli/package.json"];
    for (const depPath of dependentPaths) {
      const depPkg = await Bun.file(depPath).json();
      if (depPkg.dependencies?.boune) {
        depPkg.dependencies.boune = `^${newVersion}`;
        await write(depPath, depPkg);
      }
    }
  }

  return true;
}

async function publish(pkg: Package, target: PublishTarget, dryRun: boolean): Promise<boolean> {
  const commands: Record<PublishTarget, { cmd: string[]; args: string[] }> = {
    npm: { cmd: ["bun"], args: dryRun ? ["publish", "--dry-run"] : ["publish"] },
    jsr: {
      cmd: ["bunx", "jsr"],
      args: dryRun ? ["publish", "--dry-run", "--allow-dirty"] : ["publish", "--allow-dirty"],
    },
  };

  const { cmd, args } = commands[target];
  const proc = Bun.spawn([...cmd, ...args], {
    cwd: pkg.dir,
    stdout: "inherit",
    stderr: "inherit",
  });

  return (await proc.exited) === 0;
}

// ============================================================================
// Release Plan
// ============================================================================

function buildReleasePlan(
  packages: Package[],
  bumpType: BumpType,
  options: { skipNpm: boolean; skipJsr: boolean; dryRun: boolean },
): ReleasePlan {
  const { skipNpm, skipJsr, dryRun } = options;

  const packagesWithVersions = packages.map((pkg) => ({
    pkg,
    newVersion: bumpVersion(pkg.version, bumpType),
  }));

  const tasks: ReleaseTask[] = packagesWithVersions.flatMap(({ pkg, newVersion }) => {
    const pkgTasks: ReleaseTask[] = [
      {
        name: `Update ${pkg.name} to ${newVersion}`,
        run: () => updateVersion(pkg, newVersion, dryRun),
      },
    ];

    if (!skipNpm) {
      pkgTasks.push({
        name: `Publish ${pkg.npmName}@${newVersion} to npm`,
        run: () => publish(pkg, "npm", dryRun),
      });
    }

    // Only publish to JSR if package has a jsrName
    if (!skipJsr && pkg.jsrName) {
      pkgTasks.push({
        name: `Publish ${pkg.jsrName}@${newVersion} to jsr`,
        run: () => publish(pkg, "jsr", dryRun),
      });
    }

    return pkgTasks;
  });

  return { packages: packagesWithVersions, tasks };
}

function printReleasePlan(plan: ReleasePlan, dryRun: boolean): void {
  console.log(formatInfo("\nRelease Plan:\n"));

  for (const { pkg, newVersion } of plan.packages) {
    console.log(`  ${pkg.name}: ${pkg.version} → ${newVersion}`);
  }

  if (dryRun) {
    console.log(formatInfo("\nDry run mode - no changes will be made\n"));
  }

  console.log("");
}

async function executePlan(plan: ReleasePlan): Promise<void> {
  for (const task of plan.tasks) {
    console.log(formatInfo(task.name));
    const ok = await task.run();
    if (!ok) {
      console.log(formatError(`Failed: ${task.name}`));
      process.exit(1);
    }
    console.log(formatSuccess(task.name));
  }
}

// ============================================================================
// Bump Plan
// ============================================================================

type BumpPlan = {
  packages: Array<{ pkg: Package; newVersion: string }>;
  tasks: ReleaseTask[];
};

function buildBumpPlan(packages: Package[], bumpType: BumpType, dryRun: boolean): BumpPlan {
  const packagesWithVersions = packages.map((pkg) => ({
    pkg,
    newVersion: bumpVersion(pkg.version, bumpType),
  }));

  const tasks: ReleaseTask[] = packagesWithVersions.map(({ pkg, newVersion }) => ({
    name: `Update ${pkg.name} to ${newVersion}`,
    run: () => updateVersion(pkg, newVersion, dryRun),
  }));

  return { packages: packagesWithVersions, tasks };
}

function printBumpPlan(plan: BumpPlan, dryRun: boolean): void {
  console.log(formatInfo("\nBump Plan:\n"));

  for (const { pkg, newVersion } of plan.packages) {
    console.log(`  ${pkg.name}: ${pkg.version} → ${newVersion}`);
  }

  if (dryRun) {
    console.log(formatInfo("\nDry run mode - no changes will be made\n"));
  }

  console.log("");
}

// ============================================================================
// CLI Commands
// ============================================================================

const bumpCommand = defineCommand({
  name: "bump",
  description: "Bump versions of packages without publishing",
  options: {
    type: {
      type: "string",
      short: "t",
      long: "type",
      required: true,
      description: "Version bump type: patch, minor, major",
    },
    package: {
      type: "string",
      short: "p",
      long: "package",
      required: true,
      description: "Package to bump: boune, create-boune, cli, or all",
    },
    execute: {
      type: "boolean",
      short: "e",
      long: "execute",
      description: "Actually bump (default is dry-run)",
    },
  },
  async action({ options }) {
    const bumpType = options.type as BumpType;
    const { package: packageName, execute } = options;
    const dryRun = !execute;

    if (!["patch", "minor", "major"].includes(bumpType)) {
      console.log(formatError("--type must be one of: patch, minor, major"));
      process.exit(1);
    }

    const packages =
      packageName === "all" ? PACKAGES : PACKAGES.filter((p) => p.name === packageName);

    if (packages.length === 0) {
      console.log(formatError(`Package "${packageName}" not found`));
      process.exit(1);
    }

    const plan = buildBumpPlan(packages, bumpType, dryRun);

    printBumpPlan(plan, dryRun);

    const confirmed = await confirm({ message: "Proceed with bump?" });
    if (!confirmed) {
      console.log(formatInfo("\nBump cancelled.\n"));
      process.exit(0);
    }

    await executePlan(plan);

    console.log(formatSuccess("\nBump complete!\n"));
  },
});

const releaseCommand = defineCommand({
  name: "release",
  description: "Bump versions and publish packages to npm and jsr",
  options: {
    bump: {
      type: "string",
      short: "b",
      long: "bump",
      required: true,
      description: "Version bump type: patch, minor, major",
    },
    package: {
      type: "string",
      short: "p",
      long: "package",
      required: true,
      description: "Package to release: boune, create-boune, cli, or all",
    },
    execute: {
      type: "boolean",
      short: "e",
      long: "execute",
      description: "Actually publish (default is dry-run)",
    },
    skipNpm: { type: "boolean", long: "skip-npm", description: "Skip npm publish" },
    skipJsr: { type: "boolean", long: "skip-jsr", description: "Skip jsr publish" },
  },
  async action({ options }) {
    const bumpType = options.bump as BumpType;
    const { package: packageName, execute, skipJsr, skipNpm } = options;
    const dryRun = !execute;

    if (!["patch", "minor", "major"].includes(bumpType)) {
      console.log(formatError("--bump must be one of: patch, minor, major"));
      process.exit(1);
    }

    const packages =
      packageName === "all" ? PACKAGES : PACKAGES.filter((p) => p.name === packageName);

    if (packages.length === 0) {
      console.log(formatError(`Package "${packageName}" not found`));
      process.exit(1);
    }

    const plan = buildReleasePlan(packages, bumpType, {
      skipNpm: skipNpm ?? false,
      skipJsr: skipJsr ?? false,
      dryRun,
    });

    printReleasePlan(plan, dryRun);

    const confirmed = await confirm({ message: "Proceed with release?" });
    if (!confirmed) {
      console.log(formatInfo("\nRelease cancelled.\n"));
      process.exit(0);
    }

    await executePlan(plan);

    console.log(formatSuccess("\nRelease complete!\n"));
  },
});

void defineCli({
  name: "release",
  version: "0.1.0",
  description: "Release tool for boune monorepo",
  commands: {
    bump: bumpCommand,
    release: releaseCommand,
  },
}).run();
