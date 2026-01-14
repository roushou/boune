import { describe, expect, test } from "bun:test";
import { defineCli } from "../src/define/index.ts";
import { testCli } from "../src/testing/index.ts";

describe("testCli", () => {
  test("captures stdout", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        greet: {
          name: "greet",
          action: () => {
            console.log("Hello, World!");
          },
        },
      },
    });

    const result = await testCli(cli).run(["greet"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Hello, World!");
  });

  test("captures stderr", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        warn: {
          name: "warn",
          action: () => {
            console.error("Warning: something happened");
          },
        },
      },
    });

    const result = await testCli(cli).run(["warn"]);

    expect(result.stderr).toContain("Warning: something happened");
  });

  test("captures exit code from process.exit", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        fail: {
          name: "fail",
          action: () => {
            process.exit(1);
          },
        },
      },
    });

    const result = await testCli(cli).run(["fail"]);

    expect(result.code).toBe(1);
  });

  test("captures exit code 0 from process.exit with error handler", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        success: {
          name: "success",
          action: () => {
            console.log("Done");
            process.exit(0);
          },
          // Prevent CLI from catching the ExitError and calling process.exit(1)
          onError: () => {},
        },
      },
    });

    const result = await testCli(cli).run(["success"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Done");
  });

  test("captures thrown errors with error handler", async () => {
    let capturedError: Error | undefined;

    const cli = defineCli({
      name: "test",
      commands: {
        crash: {
          name: "crash",
          action: () => {
            throw new Error("Something went wrong");
          },
          onError: (error) => {
            capturedError = error;
          },
        },
      },
    });

    const result = await testCli(cli).run(["crash"]);

    expect(result.code).toBe(0); // No process.exit called
    expect(capturedError).toBeDefined();
    expect(capturedError!.message).toBe("Something went wrong");
  });

  test("thrown errors without handler call process.exit(1)", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        crash: {
          name: "crash",
          action: () => {
            throw new Error("Something went wrong");
          },
        },
      },
    });

    const result = await testCli(cli).run(["crash"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Something went wrong");
  });

  test("sets environment variables", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        env: {
          name: "env",
          action: () => {
            console.log(`API_KEY=${process.env.API_KEY}`);
          },
        },
      },
    });

    const result = await testCli(cli).env({ API_KEY: "secret-123" }).run(["env"]);

    expect(result.stdout).toContain("API_KEY=secret-123");
  });

  test("restores environment variables after test", async () => {
    const originalValue = process.env.TEST_VAR;
    process.env.TEST_VAR = "original";

    const cli = defineCli({
      name: "test",
      commands: {
        noop: {
          name: "noop",
          action: () => {},
        },
      },
    });

    await testCli(cli).env({ TEST_VAR: "modified" }).run(["noop"]);

    expect(process.env.TEST_VAR).toBe("original");

    // Cleanup
    if (originalValue === undefined) {
      delete process.env.TEST_VAR;
    } else {
      process.env.TEST_VAR = originalValue;
    }
  });

  test("passes arguments to command", async () => {
    let receivedArgs: { target: string } | undefined;

    const cli = defineCli({
      name: "test",
      commands: {
        deploy: {
          name: "deploy",
          arguments: {
            target: { type: "string", required: true },
          },
          action: (ctx) => {
            receivedArgs = ctx.args as { target: string };
            console.log(`Deploying to ${(ctx.args as { target: string }).target}`);
          },
        },
      },
    });

    const result = await testCli(cli).run(["deploy", "production"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Deploying to production");
    expect(receivedArgs?.target).toBe("production");
  });

  test("passes options to command", async () => {
    let receivedOptions: { port: number; host: string } | undefined;

    const cli = defineCli({
      name: "test",
      commands: {
        serve: {
          name: "serve",
          options: {
            port: { type: "number", short: "p", default: 3000 },
            host: { type: "string", default: "localhost" },
          },
          action: (ctx) => {
            const opts = ctx.options as { port: number; host: string };
            receivedOptions = opts;
            console.log(`Serving on ${opts.host}:${opts.port}`);
          },
        },
      },
    });

    const result = await testCli(cli).run(["serve", "--port", "8080", "--host", "0.0.0.0"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Serving on 0.0.0.0:8080");
    expect(receivedOptions?.port).toBe(8080);
    expect(receivedOptions?.host).toBe("0.0.0.0");
  });

  test("handles timeout", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        slow: {
          name: "slow",
          action: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10000));
          },
        },
      },
    });

    const result = await testCli(cli).timeout(100).run(["slow"]);

    expect(result.code).toBe(1);
    expect(result.error?.message).toContain("timed out");
  });

  test("chainable API returns new instance", () => {
    const cli = defineCli({
      name: "test",
      commands: {},
    });

    const runner1 = testCli(cli);
    const runner2 = runner1.env({ FOO: "bar" });
    const runner3 = runner2.timeout(1000);

    // Each call should return a new instance
    expect(runner1).not.toBe(runner2);
    expect(runner2).not.toBe(runner3);
  });

  test("captures multiple console.log calls", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        multi: {
          name: "multi",
          action: () => {
            console.log("Line 1");
            console.log("Line 2");
            console.log("Line 3");
          },
        },
      },
    });

    const result = await testCli(cli).run(["multi"]);

    expect(result.stdout).toContain("Line 1");
    expect(result.stdout).toContain("Line 2");
    expect(result.stdout).toContain("Line 3");
  });

  test("supports env option from option definition", async () => {
    const cli = defineCli({
      name: "test",
      commands: {
        config: {
          name: "config",
          options: {
            apiKey: { type: "string", env: "API_KEY" },
          },
          action: (ctx) => {
            console.log(`Key: ${ctx.options.apiKey}`);
          },
        },
      },
    });

    const result = await testCli(cli).env({ API_KEY: "env-secret" }).run(["config"]);

    expect(result.stdout).toContain("Key: env-secret");
  });

  test("handles --help flag", async () => {
    const cli = defineCli({
      name: "test",
      description: "A test CLI",
      commands: {
        greet: {
          name: "greet",
          description: "Greet someone",
        },
      },
    });

    const result = await testCli(cli).run(["--help"]);

    expect(result.stdout).toContain("A test CLI");
  });

  test("handles --version flag", async () => {
    const cli = defineCli({
      name: "test",
      version: "1.2.3",
      commands: {},
    });

    const result = await testCli(cli).run(["--version"]);

    expect(result.stdout).toContain("1.2.3");
  });
});
