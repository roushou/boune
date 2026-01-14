import { defineCli, defineCommand } from "../src/define/index.ts";
import { describe, expect, mock, test } from "bun:test";
import { testCli } from "../src/testing/index.ts";

describe("defineCli", () => {
  test("creates cli with declarative schema", () => {
    const app = defineCli({
      name: "myapp",
      commands: {},
    });
    expect(app).toBeDefined();
  });

  test("sets version", () => {
    const app = defineCli({
      name: "myapp",
      version: "1.0.0",
      commands: {},
    });
    expect(app.getConfig().version).toBe("1.0.0");
  });

  test("adds commands from schema", () => {
    const app = defineCli({
      name: "myapp",
      commands: {
        build: {
          name: "build",
          description: "Build project",
        },
      },
    });
    expect(app.getConfig().commands["build"]).toBeDefined();
  });

  test("runs command action", async () => {
    const actionMock = mock(() => {});

    const app = defineCli({
      name: "myapp",
      commands: {
        build: {
          name: "build",
          description: "Build project",
          action: actionMock,
        },
      },
    });

    await testCli(app).run(["build"]);

    expect(actionMock).toHaveBeenCalled();
  });

  test("passes parsed args to action", async () => {
    let receivedContext: { args: { name: string } } | undefined;

    const app = defineCli({
      name: "myapp",
      commands: {
        greet: {
          name: "greet",
          arguments: {
            name: { type: "string", required: true, description: "Name" },
          },
          action: (ctx) => {
            receivedContext = ctx;
          },
        },
      },
    });

    await testCli(app).run(["greet", "World"]);

    expect(receivedContext?.args.name).toBe("World");
  });

  test("passes parsed options to action", async () => {
    let receivedContext: { options: { port: number } } | undefined;

    const app = defineCli({
      name: "myapp",
      commands: {
        serve: {
          name: "serve",
          options: {
            port: { type: "number", short: "p", default: 3000, description: "Port" },
          },
          action: (ctx) => {
            receivedContext = ctx;
          },
        },
      },
    });

    await testCli(app).run(["serve", "--port", "8080"]);

    expect(receivedContext?.options.port).toBe(8080);
  });

  test("shows help with --help flag", async () => {
    const app = defineCli({
      name: "myapp",
      version: "1.0.0",
      description: "My app",
      commands: {},
    });

    const result = await testCli(app).run(["--help"]);

    expect(result.stdout).toContain("My app");
  });

  test("shows version with --version flag", async () => {
    const app = defineCli({
      name: "myapp",
      version: "1.2.3",
      commands: {},
    });

    const result = await testCli(app).run(["--version"]);

    expect(result.stdout).toContain("1.2.3");
  });

  test("runs subcommands", async () => {
    const actionMock = mock(() => {});

    const app = defineCli({
      name: "myapp",
      commands: {
        build: {
          name: "build",
          description: "Build",
          subcommands: {
            watch: {
              name: "watch",
              description: "Watch mode",
              action: actionMock,
            },
          },
        },
      },
    });

    await testCli(app).run(["build", "watch"]);

    expect(actionMock).toHaveBeenCalled();
  });

  test("runs before middleware", async () => {
    const order: string[] = [];

    const app = defineCli({
      name: "myapp",
      commands: {
        build: {
          name: "build",
          before: [
            async (_ctx, next) => {
              order.push("before");
              await next();
            },
          ],
          action: () => {
            order.push("action");
          },
        },
      },
    });

    await testCli(app).run(["build"]);

    expect(order).toEqual(["before", "action"]);
  });

  test("runs after middleware", async () => {
    const order: string[] = [];

    const app = defineCli({
      name: "myapp",
      commands: {
        build: {
          name: "build",
          action: () => {
            order.push("action");
          },
          after: [
            async () => {
              order.push("after");
            },
          ],
        },
      },
    });

    await testCli(app).run(["build"]);

    expect(order).toEqual(["action", "after"]);
  });

  test("runs global middleware before command middleware", async () => {
    const order: string[] = [];

    const app = defineCli({
      name: "myapp",
      middleware: [
        async (_ctx, next) => {
          order.push("global");
          await next();
        },
      ],
      commands: {
        build: {
          name: "build",
          before: [
            async (_ctx, next) => {
              order.push("command");
              await next();
            },
          ],
          action: () => {
            order.push("action");
          },
        },
      },
    });

    await testCli(app).run(["build"]);

    expect(order).toEqual(["global", "command", "action"]);
  });

  test("handles errors with command error handler", async () => {
    let caughtError: Error | undefined;

    const app = defineCli({
      name: "myapp",
      commands: {
        fail: {
          name: "fail",
          action: () => {
            throw new Error("Command failed");
          },
          onError: (error) => {
            caughtError = error;
          },
        },
      },
    });

    await testCli(app).run(["fail"]);

    expect(caughtError).toBeDefined();
    expect(caughtError!.message).toBe("Command failed");
  });

  test("handles errors with global error handler", async () => {
    let caughtError: Error | undefined;

    const app = defineCli({
      name: "myapp",
      onError: (error) => {
        caughtError = error;
      },
      commands: {
        fail: {
          name: "fail",
          action: () => {
            throw new Error("Command failed");
          },
        },
      },
    });

    await testCli(app).run(["fail"]);

    expect(caughtError).toBeDefined();
    expect(caughtError!.message).toBe("Command failed");
  });

  test("accepts pre-built CommandConfig", async () => {
    const actionMock = mock(() => {});

    const buildCommand = defineCommand({
      name: "build",
      description: "Build project",
      action: actionMock,
    });

    const app = defineCli({
      name: "myapp",
      commands: {
        build: buildCommand,
      },
    });

    await testCli(app).run(["build"]);

    expect(actionMock).toHaveBeenCalled();
  });

  test("registers command aliases", async () => {
    const actionMock = mock(() => {});

    const app = defineCli({
      name: "myapp",
      commands: {
        build: {
          name: "build",
          aliases: ["b"],
          action: actionMock,
        },
      },
    });

    await testCli(app).run(["b"]);

    expect(actionMock).toHaveBeenCalled();
  });

  test("adds global options", async () => {
    let receivedContext: { options: { verbose: boolean } } | undefined;

    const app = defineCli({
      name: "myapp",
      globalOptions: {
        verbose: { type: "boolean", short: "v", description: "Verbose output" },
      },
      commands: {
        build: {
          name: "build",
          action: (ctx) => {
            receivedContext = ctx;
          },
        },
      },
    });

    await testCli(app).run(["build", "--verbose"]);

    expect(receivedContext?.options.verbose).toBe(true);
  });
});
