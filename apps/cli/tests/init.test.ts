import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("init command", () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "boune-init-test-"));
    projectDir = join(tempDir, "test-project");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("creates minimal template with --yes flag", async () => {
    const cliPath = join(import.meta.dir, "../src/app.ts");

    const proc = Bun.spawn(
      ["bun", "run", cliPath, "init", projectDir, "--yes", "--template=minimal"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    await proc.exited;

    // Check package.json was created
    const packageJsonPath = join(projectDir, "package.json");
    expect(existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    expect(packageJson.name).toBe("test-project");
    expect(packageJson.version).toBe("0.1.0");
    expect(packageJson.type).toBe("module");
    expect(packageJson.dependencies.boune).toBeDefined();

    // Check app.ts was created
    const appTsPath = join(projectDir, "src/app.ts");
    expect(existsSync(appTsPath)).toBe(true);

    const appTs = await readFile(appTsPath, "utf-8");
    expect(appTs).toContain("defineCli");
    expect(appTs).toContain("defineCommand");
    expect(appTs).toContain('name: "test-project"');

    // Check .gitignore was created
    const gitignorePath = join(projectDir, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);

    // Check git was initialized
    const gitDir = join(projectDir, ".git");
    expect(existsSync(gitDir)).toBe(true);
  });

  test("creates full template with --yes flag", async () => {
    const cliPath = join(import.meta.dir, "../src/app.ts");

    const proc = Bun.spawn(
      ["bun", "run", cliPath, "init", projectDir, "--yes", "--template=full"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    await proc.exited;

    // Check package.json was created
    const packageJsonPath = join(projectDir, "package.json");
    expect(existsSync(packageJsonPath)).toBe(true);

    // Check commands directory structure
    const commandsDir = join(projectDir, "src/commands");
    expect(existsSync(commandsDir)).toBe(true);

    const helloTsPath = join(commandsDir, "hello.ts");
    expect(existsSync(helloTsPath)).toBe(true);

    const indexTsPath = join(commandsDir, "index.ts");
    expect(existsSync(indexTsPath)).toBe(true);

    // Check hello command content
    const helloTs = await readFile(helloTsPath, "utf-8");
    expect(helloTs).toContain("defineCommand");
    expect(helloTs).toContain('name: "hello"');
    expect(helloTs).toContain("uppercase");
  });

  test("uses custom project name with --name flag", async () => {
    const cliPath = join(import.meta.dir, "../src/app.ts");

    const proc = Bun.spawn(
      ["bun", "run", cliPath, "init", projectDir, "--yes", "--name=my-custom-cli"],
      {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    await proc.exited;

    const packageJsonPath = join(projectDir, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));

    expect(packageJson.name).toBe("my-custom-cli");
    expect(packageJson.bin["my-custom-cli"]).toBe("./src/app.ts");
  });

  test("generated CLI runs successfully", async () => {
    const cliPath = join(import.meta.dir, "../src/app.ts");

    // Create the project
    const initProc = Bun.spawn(["bun", "run", cliPath, "init", projectDir, "--yes"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    await initProc.exited;

    // Run the generated CLI
    const generatedCliPath = join(projectDir, "src/app.ts");
    const runProc = Bun.spawn(["bun", "run", generatedCliPath, "--help"], {
      cwd: projectDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await runProc.exited;
    const stdout = await new Response(runProc.stdout).text();

    expect(exitCode).toBe(0);
    expect(stdout).toContain("test-project");
    expect(stdout).toContain("hello");
  });

  test("generated CLI hello command works", async () => {
    const cliPath = join(import.meta.dir, "../src/app.ts");

    // Create the project
    const initProc = Bun.spawn(["bun", "run", cliPath, "init", projectDir, "--yes"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    await initProc.exited;

    // Run hello command
    const generatedCliPath = join(projectDir, "src/app.ts");
    const runProc = Bun.spawn(["bun", "run", generatedCliPath, "hello", "World"], {
      cwd: projectDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await runProc.exited;
    const stdout = await new Response(runProc.stdout).text();

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Hello, World!");
  });

  test("creates .gitignore with correct content", async () => {
    const cliPath = join(import.meta.dir, "../src/app.ts");

    const proc = Bun.spawn(["bun", "run", cliPath, "init", projectDir, "--yes", "--name=mycli"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    await proc.exited;

    const gitignorePath = join(projectDir, ".gitignore");
    const gitignore = await readFile(gitignorePath, "utf-8");

    expect(gitignore).toContain("node_modules/");
    expect(gitignore).toContain("dist/");
    expect(gitignore).toContain("*.log");
    expect(gitignore).toContain(".DS_Store");
    expect(gitignore).toContain("mycli"); // binary name
  });
});
