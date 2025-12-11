import { describe, expect, test } from "bun:test";

import { argument } from "../src/schema/argument.ts";
import { defineCommand } from "../src/define/index.ts";
import { option } from "../src/schema/option.ts";

describe("defineCommand", () => {
  test("creates a command with name", () => {
    const config = defineCommand({
      name: "build",
    });
    expect(config.name).toBe("build");
  });

  test("sets description", () => {
    const config = defineCommand({
      name: "build",
      description: "Build the project",
    });
    expect(config.description).toBe("Build the project");
  });

  test("adds aliases", () => {
    const config = defineCommand({
      name: "build",
      aliases: ["b", "compile"],
    });
    expect(config.aliases).toEqual(["b", "compile"]);
  });

  test("adds required argument", () => {
    const config = defineCommand({
      name: "greet",
      arguments: {
        name: argument.string().required().describe("Name to greet"),
      },
    });
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

  test("adds optional argument with default", () => {
    const config = defineCommand({
      name: "greet",
      arguments: {
        name: argument.string().default("World").describe("Name to greet"),
      },
    });
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
    const config = defineCommand({
      name: "cat",
      arguments: {
        files: argument.string().required().variadic().describe("Files to concatenate"),
      },
    });
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
    const config = defineCommand({
      name: "build",
      options: {
        verbose: option.boolean().short("v").describe("Verbose output"),
      },
    });
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
    const config = defineCommand({
      name: "build",
      options: {
        output: option.string().short("o").describe("Output directory"),
      },
    });
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
    const config = defineCommand({
      name: "serve",
      options: {
        port: option.number().short("p").env("PORT").default(3000).describe("Port"),
      },
    });
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
    const config = defineCommand({
      name: "build",
      subcommands: {
        watch: {
          name: "watch",
          description: "Watch mode",
        },
      },
    });
    expect(config.subcommands["watch"]?.name).toBe("watch");
  });

  test("sets action handler", () => {
    const handler = () => {};
    const config = defineCommand({
      name: "build",
      action: handler,
    });
    expect(config.action).toBe(handler);
  });

  test("hides command", () => {
    const config = defineCommand({
      name: "internal",
      hidden: true,
    });
    expect(config.hidden).toBe(true);
  });

  test("adds before middleware", () => {
    const handler = async (_ctx: unknown, next: () => Promise<void>) => {
      await next();
    };
    const config = defineCommand({
      name: "build",
      before: [handler],
    });
    expect(config.before).toEqual([handler]);
  });

  test("adds after middleware", () => {
    const handler = async (_ctx: unknown, next: () => Promise<void>) => {
      await next();
    };
    const config = defineCommand({
      name: "build",
      after: [handler],
    });
    expect(config.after).toEqual([handler]);
  });

  test("adds error handler", () => {
    const handler = () => {};
    const config = defineCommand({
      name: "build",
      onError: handler,
    });
    expect(config.onError).toBe(handler);
  });

  test("creates complete command with all options", () => {
    const config = defineCommand({
      name: "build",
      description: "Build the project",
      aliases: ["b"],
      arguments: {
        entry: argument.string().required().describe("Entry file"),
      },
      options: {
        output: option.string().short("o").describe("Output directory"),
        watch: option.boolean().short("w").describe("Watch mode"),
      },
      action: ({ args, options }) => {
        console.log(args, options);
      },
    });

    expect(config.name).toBe("build");
    expect(config.description).toBe("Build the project");
    expect(config.aliases).toEqual(["b"]);
    expect(config.arguments.length).toBe(1);
    expect(config.options.length).toBe(2);
    expect(config.action).toBeDefined();
  });

  test("registers subcommand aliases", () => {
    const config = defineCommand({
      name: "remote",
      subcommands: {
        remove: {
          name: "remove",
          description: "Remove a remote",
          aliases: ["rm"],
        },
      },
    });
    // Both 'remove' and 'rm' should point to the same config
    expect(config.subcommands["remove"]).toBeDefined();
    expect(config.subcommands["rm"]).toBeDefined();
    expect(config.subcommands["remove"]).toBe(config.subcommands["rm"]);
  });
});
