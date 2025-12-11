#!/usr/bin/env bun

import {
  defineCli,
  defineCommand,
  error,
  info,
  option,
  success,
} from "../packages/boune/src/index.ts";
import bouneJsrPkg from "../packages/boune/jsr.json";
import bounePkg from "../packages/boune/package.json";
import { confirm } from "../packages/boune/src/prompt/index.ts";
import createBouneJsrPkg from "../packages/create-boune/package.json";
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
  jsrName: string;
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
    npmName: bounePkg.name,
    jsrName: createBouneJsrPkg.name,
    version: createBounePkg.version,
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
  const [, major, minor, patch] = match.map(Number);
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

  const jsrJsonPath = `${pkg.dir}/jsr.json`;
  const jsrJson = await Bun.file(jsrJsonPath).json();
  jsrJson.version = newVersion;
  await write(jsrJsonPath, jsrJson);

  if (pkg.name === "boune") {
    const createPkgPath = "packages/create-boune/package.json";
    const createPkg = await Bun.file(createPkgPath).json();
    if (createPkg.dependencies?.boune) {
      createPkg.dependencies.boune = `^${newVersion}`;
      await write(createPkgPath, createPkg);
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

    if (!skipJsr) {
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
  console.log(info("\nRelease Plan:\n"));

  for (const { pkg, newVersion } of plan.packages) {
    console.log(`  ${pkg.name}: ${pkg.version} → ${newVersion}`);
  }

  if (dryRun) {
    console.log(info("\nDry run mode - no changes will be made\n"));
  }

  console.log("");
}

async function executePlan(plan: ReleasePlan): Promise<void> {
  for (const task of plan.tasks) {
    console.log(info(task.name));
    const ok = await task.run();
    if (!ok) {
      console.log(error(`Failed: ${task.name}`));
      process.exit(1);
    }
    console.log(success(task.name));
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
  console.log(info("\nBump Plan:\n"));

  for (const { pkg, newVersion } of plan.packages) {
    console.log(`  ${pkg.name}: ${pkg.version} → ${newVersion}`);
  }

  if (dryRun) {
    console.log(info("\nDry run mode - no changes will be made\n"));
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
    type: option
      .string()
      .short("t")
      .long("type")
      .required()
      .describe("Version bump type: patch, minor, major"),
    package: option
      .string()
      .short("p")
      .long("package")
      .required()
      .describe("Package to bump: boune, create-boune, or all"),
    execute: option
      .boolean()
      .short("e")
      .long("execute")
      .describe("Actually bump (default is dry-run)"),
  },
  async action({ options }) {
    const bumpType = options.type as BumpType;
    const { package: packageName, execute } = options;
    const dryRun = !execute;

    if (!["patch", "minor", "major"].includes(bumpType)) {
      console.log(error("--type must be one of: patch, minor, major"));
      process.exit(1);
    }

    const packages =
      packageName === "all" ? PACKAGES : PACKAGES.filter((p) => p.name === packageName);

    if (packages.length === 0) {
      console.log(error(`Package "${packageName}" not found`));
      process.exit(1);
    }

    const plan = buildBumpPlan(packages, bumpType, dryRun);

    printBumpPlan(plan, dryRun);

    const confirmed = await confirm({ message: "Proceed with bump?" });
    if (!confirmed) {
      console.log(info("\nBump cancelled.\n"));
      process.exit(0);
    }

    await executePlan(plan);

    console.log(success("\nBump complete!\n"));
  },
});

const releaseCommand = defineCommand({
  name: "release",
  description: "Bump versions and publish packages to npm and jsr",
  options: {
    bump: option
      .string()
      .short("b")
      .long("bump")
      .required()
      .describe("Version bump type: patch, minor, major"),
    package: option
      .string()
      .short("p")
      .long("package")
      .required()
      .describe("Package to release: boune, create-boune, or all"),
    execute: option
      .boolean()
      .short("e")
      .long("execute")
      .describe("Actually publish (default is dry-run)"),
    skipNpm: option.boolean().long("skip-npm").describe("Skip npm publish"),
    skipJsr: option.boolean().long("skip-jsr").describe("Skip jsr publish"),
  },
  async action({ options }) {
    const bumpType = options.bump as BumpType;
    const { package: packageName, execute, skipJsr, skipNpm } = options;
    const dryRun = !execute;

    if (!["patch", "minor", "major"].includes(bumpType)) {
      console.log(error("--bump must be one of: patch, minor, major"));
      process.exit(1);
    }

    const packages =
      packageName === "all" ? PACKAGES : PACKAGES.filter((p) => p.name === packageName);

    if (packages.length === 0) {
      console.log(error(`Package "${packageName}" not found`));
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
      console.log(info("\nRelease cancelled.\n"));
      process.exit(0);
    }

    await executePlan(plan);

    console.log(success("\nRelease complete!\n"));
  },
});

defineCli({
  name: "release",
  version: "0.1.0",
  description: "Release tool for boune monorepo",
  commands: {
    bump: bumpCommand,
    release: releaseCommand,
  },
}).run();
