#!/usr/bin/env bun

import { cli, command, info, success, error } from "../packages/boune/src/index.ts";

import bounePkg from "../packages/boune/package.json";
import createBounePkg from "../packages/create-boune/package.json";

const PACKAGES = [
  {
    name: "boune",
    dir: "packages/boune",
    npmName: "boune",
    jsrName: "@boune/cli",
    version: bounePkg.version,
  },
  {
    name: "create-boune",
    dir: "packages/create-boune",
    npmName: "create-boune",
    jsrName: "@boune/create",
    version: createBounePkg.version,
  },
];

type BumpType = "patch" | "minor" | "major";

type Version = {
  major: number;
  minor: number;
  patch: number;
};

function parseVersion(version: string): Version {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver version: "${version}"`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpVersion(version: string, type: BumpType): string {
  const { major, minor, patch } = parseVersion(version);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

async function updateVersion(pkgName: string, newVersion: string): Promise<void> {
  const pkg = PACKAGES.find((p) => p.name === pkgName);
  if (!pkg) throw new Error(`Package ${pkgName} not found`);

  const write = (path: string, data: unknown) =>
    Bun.write(path, JSON.stringify(data, null, 2) + "\n");

  // Update package.json
  const pkgJsonPath = `${pkg.dir}/package.json`;
  const pkgJson = await Bun.file(pkgJsonPath).json();
  pkgJson.version = newVersion;
  await write(pkgJsonPath, pkgJson);

  // Update jsr.json
  const jsrJsonPath = `${pkg.dir}/jsr.json`;
  const jsrJson = await Bun.file(jsrJsonPath).json();
  jsrJson.version = newVersion;
  await write(jsrJsonPath, jsrJson);

  // Update dependency in create-boune if we're updating boune
  if (pkgName === "boune") {
    const createPkgPath = "packages/create-boune/package.json";
    const createPkg = await Bun.file(createPkgPath).json();
    if (createPkg.dependencies?.boune) {
      createPkg.dependencies.boune = `^${newVersion}`;
      await write(createPkgPath, createPkg);
    }
  }
}

async function publishToNpm(pkgDir: string, dryRun: boolean): Promise<boolean> {
  const args = dryRun ? ["publish", "--dry-run"] : ["publish"];
  const proc = Bun.spawn(["bun", ...args], {
    cwd: pkgDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

async function publishToJsr(pkgDir: string, dryRun: boolean): Promise<boolean> {
  const args = dryRun ? ["publish", "--dry-run", "--allow-dirty"] : ["publish", "--allow-dirty"];
  const proc = Bun.spawn(["bunx", "jsr", ...args], {
    cwd: pkgDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

const releaseCommand = command("release")
  .description("Bump versions and publish packages to npm and jsr")
  .option("-b, --bump <type>", "Version bump type: patch, minor, major", { required: true })
  .option("-p, --package <name>", "Package to release: boune, create-boune, or all", {
    required: true,
  })
  .option("-d, --dry-run", "Run without actually publishing")
  .option("--skip-npm", "Skip npm publish")
  .option("--skip-jsr", "Skip jsr publish")
  .action(async ({ options }) => {
    const bumpType = options.bump as BumpType;
    const packageName = options.package as string;
    const dryRun = options["dry-run"] as boolean;
    const skipNpm = options["skip-npm"] as boolean;
    const skipJsr = options["skip-jsr"] as boolean;

    if (!["patch", "minor", "major"].includes(bumpType)) {
      console.log(error("--bump must be one of: patch, minor, major"));
      process.exit(1);
    }

    const packagesToRelease =
      packageName === "all" ? PACKAGES : PACKAGES.filter((p) => p.name === packageName);

    if (packagesToRelease.length === 0) {
      console.log(error(`Package "${packageName}" not found`));
      process.exit(1);
    }

    console.log(info("\nRelease Plan:\n"));

    for (const pkg of packagesToRelease) {
      const newVersion = bumpVersion(pkg.version, bumpType);
      console.log(`  ${pkg.name}: ${pkg.version} → ${newVersion}`);
    }

    if (dryRun) {
      console.log(info("\nDry run mode - no changes will be made\n"));
    }

    console.log("");

    // Update versions and publish
    for (const pkg of packagesToRelease) {
      const newVersion = bumpVersion(pkg.version, bumpType);

      console.log(info(`Updating ${pkg.name} to ${newVersion}...`));
      if (!dryRun) {
        await updateVersion(pkg.name, newVersion);
      }

      if (!skipNpm) {
        console.log(info(`\nPublishing ${pkg.npmName}@${newVersion} to npm...`));
        const npmSuccess = await publishToNpm(pkg.dir, dryRun);
        if (!npmSuccess) {
          console.log(error(`Failed to publish ${pkg.npmName} to npm`));
          process.exit(1);
        }
        console.log(success(`Published ${pkg.npmName}@${newVersion} to npm`));
      }

      if (!skipJsr) {
        console.log(info(`\nPublishing ${pkg.jsrName}@${newVersion} to jsr...`));
        const jsrSuccess = await publishToJsr(pkg.dir, dryRun);
        if (!jsrSuccess) {
          console.log(error(`Failed to publish ${pkg.jsrName} to jsr`));
          process.exit(1);
        }
        console.log(success(`Published ${pkg.jsrName}@${newVersion} to jsr`));
      }
    }

    console.log(success("\nRelease complete!\n"));
  });

cli("release")
  .version("0.1.0")
  .description("Release tool for boune monorepo")
  .command(releaseCommand)
  .run();
