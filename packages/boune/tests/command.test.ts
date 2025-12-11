import { describe, expect, test } from "bun:test";
import { command } from "../src/command.ts";

describe("command builder", () => {
  test("creates a command with name", () => {
    const cmd = command("build");
    const config = cmd.getConfig();
    expect(config.name).toBe("build");
  });

  test("sets description", () => {
    const cmd = command("build").description("Build the project");
    const config = cmd.getConfig();
    expect(config.description).toBe("Build the project");
  });

  test("adds aliases", () => {
    const cmd = command("build").alias("b", "compile");
    const config = cmd.getConfig();
    expect(config.aliases).toEqual(["b", "compile"]);
  });

  test("adds required argument", () => {
    const cmd = command("greet").argument({
      name: "name",
      kind: "string",
      required: true,
      description: "Name to greet",
    });
    const config = cmd.getConfig();
    expect(config.arguments).toEqual([
      {
        name: "name",
        description: "Name to greet",
        required: true,
        type: "string",
        variadic: false,
        default: undefined,
        validate: undefined,
      },
    ]);
  });

  test("adds optional argument", () => {
    const cmd = command("greet").argument({
      name: "name",
      kind: "string",
      required: false,
      description: "Name to greet",
      default: "World",
    });
    const config = cmd.getConfig();
    expect(config.arguments).toEqual([
      {
        name: "name",
        description: "Name to greet",
        required: false,
        type: "string",
        default: "World",
        variadic: false,
        validate: undefined,
      },
    ]);
  });

  test("adds variadic argument", () => {
    const cmd = command("cat").argument({
      name: "files",
      kind: "string",
      required: true,
      variadic: true,
      description: "Files to concatenate",
    });
    const config = cmd.getConfig();
    expect(config.arguments).toEqual([
      {
        name: "files",
        description: "Files to concatenate",
        required: true,
        type: "string",
        variadic: true,
        default: undefined,
        validate: undefined,
      },
    ]);
  });

  test("adds boolean option", () => {
    const cmd = command("build").option({
      name: "verbose",
      short: "v",
      kind: "boolean",
      description: "Verbose output",
    });
    const config = cmd.getConfig();
    expect(config.options).toEqual([
      {
        name: "verbose",
        short: "v",
        long: "verbose",
        description: "Verbose output",
        type: "boolean",
        required: false,
        default: false,
        env: undefined,
        validate: undefined,
      },
    ]);
  });

  test("adds string option", () => {
    const cmd = command("build").option({
      name: "output",
      short: "o",
      kind: "string",
      description: "Output directory",
    });
    const config = cmd.getConfig();
    expect(config.options).toEqual([
      {
        name: "output",
        short: "o",
        long: "output",
        description: "Output directory",
        type: "string",
        required: false,
        default: undefined,
        env: undefined,
        validate: undefined,
      },
    ]);
  });

  test("adds option with env var", () => {
    const cmd = command("serve").option({
      name: "port",
      short: "p",
      kind: "number",
      description: "Port",
      env: "PORT",
      default: 3000,
    });
    const config = cmd.getConfig();
    expect(config.options).toEqual([
      {
        name: "port",
        short: "p",
        long: "port",
        description: "Port",
        type: "number",
        required: false,
        env: "PORT",
        default: 3000,
        validate: undefined,
      },
    ]);
  });

  test("adds subcommand", () => {
    const sub = command("watch").description("Watch mode");
    const cmd = command("build").subcommand(sub);
    const config = cmd.getConfig();
    expect(config.subcommands.get("watch")?.name).toBe("watch");
  });

  test("sets action handler", () => {
    const handler = () => {};
    const cmd = command("build").action(handler);
    const config = cmd.getConfig();
    expect(config.action).toBe(handler);
  });

  test("hides command", () => {
    const cmd = command("internal").hidden();
    const config = cmd.getConfig();
    expect(config.hidden).toBe(true);
  });

  test("adds hooks", () => {
    const handler = () => {};
    const cmd = command("build").hook("preAction", handler);
    const config = cmd.getConfig();
    expect(config.hooks.get("preAction")).toEqual([handler]);
  });

  test("chains all methods", () => {
    const cmd = command("build")
      .description("Build the project")
      .alias("b")
      .argument({ name: "entry", kind: "string", required: true, description: "Entry file" })
      .option({ name: "output", short: "o", kind: "string", description: "Output directory" })
      .option({ name: "watch", short: "w", kind: "boolean", description: "Watch mode" })
      .action(({ args, options }) => {
        console.log(args, options);
      });

    const config = cmd.getConfig();
    expect(config.name).toBe("build");
    expect(config.description).toBe("Build the project");
    expect(config.aliases).toEqual(["b"]);
    expect(config.arguments.length).toBe(1);
    expect(config.options.length).toBe(2);
    expect(config.action).toBeDefined();
  });
});
