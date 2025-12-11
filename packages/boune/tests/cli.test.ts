import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { defineCli, defineCommand } from "../src/define/index.ts";
import { argument } from "../src/schema/argument.ts";
import { option } from "../src/schema/option.ts";

describe("defineCli", () => {
  let consoleSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });

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
    await app.run(["build"]);

    expect(actionMock).toHaveBeenCalled();
  });

  test("passes parsed args to action", async () => {
    let receivedContext: any;

    const app = defineCli({
      name: "myapp",
      commands: {
        greet: {
          name: "greet",
          arguments: {
            name: argument.string().required().describe("Name"),
          },
          action: (ctx) => {
            receivedContext = ctx;
          },
        },
      },
    });
    await app.run(["greet", "World"]);

    expect(receivedContext.args.name).toBe("World");
  });

  test("passes parsed options to action", async () => {
    let receivedContext: any;

    const app = defineCli({
      name: "myapp",
      commands: {
        serve: {
          name: "serve",
          options: {
            port: option.number().short("p").default(3000).describe("Port"),
          },
          action: (ctx) => {
            receivedContext = ctx;
          },
        },
      },
    });
    await app.run(["serve", "--port", "8080"]);

    expect(receivedContext.options.port).toBe(8080);
  });

  test("shows help with --help flag", async () => {
    const app = defineCli({
      name: "myapp",
      version: "1.0.0",
      description: "My app",
      commands: {},
    });
    await app.run(["--help"]);

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0];
    expect(output).toContain("My app");
  });

  test("shows version with --version flag", async () => {
    const app = defineCli({
      name: "myapp",
      version: "1.2.3",
      commands: {},
    });
    await app.run(["--version"]);

    expect(consoleSpy).toHaveBeenCalledWith("1.2.3");
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
    await app.run(["build", "watch"]);

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
    await app.run(["build"]);

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
    await app.run(["build"]);

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
    await app.run(["build"]);

    expect(order).toEqual(["global", "command", "action"]);
  });

  test("handles errors with command error handler", async () => {
    let caughtError: Error | null = null;

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
    await app.run(["fail"]);

    expect(caughtError?.message).toBe("Command failed");
  });

  test("handles errors with global error handler", async () => {
    let caughtError: Error | null = null;

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
    await app.run(["fail"]);

    expect(caughtError?.message).toBe("Command failed");
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
    await app.run(["build"]);

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

    // Running with alias should work
    await app.run(["b"]);
    expect(actionMock).toHaveBeenCalled();
  });

  test("adds global options", async () => {
    let receivedContext: any;

    const app = defineCli({
      name: "myapp",
      globalOptions: {
        verbose: option.boolean().short("v").describe("Verbose output"),
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
    await app.run(["build", "--verbose"]);

    expect(receivedContext.options.verbose).toBe(true);
  });
});
