import { describe, expect, test } from "bun:test";
import type { OptionDef } from "../src/types/index.ts";
import { parseOptions } from "../src/parser/options.ts";
import { tokenize } from "../src/parser/tokenizer.ts";

describe("parseOptions", () => {
  test("parses boolean flags", () => {
    const defs: OptionDef[] = [
      { name: "verbose", short: "v", description: "Verbose", type: "boolean", required: false },
    ];
    const tokens = tokenize(["--verbose"]);
    const { options, errors } = parseOptions(tokens, defs);
    expect(options).toEqual({ verbose: true });
    expect(errors).toEqual([]);
  });

  test("parses short boolean flags", () => {
    const defs: OptionDef[] = [
      { name: "verbose", short: "v", description: "Verbose", type: "boolean", required: false },
    ];
    const tokens = tokenize(["-v"]);
    const { options, errors } = parseOptions(tokens, defs);
    expect(options).toEqual({ verbose: true });
    expect(errors).toEqual([]);
  });

  test("parses string options", () => {
    const defs: OptionDef[] = [
      { name: "output", short: "o", description: "Output", type: "string", required: false },
    ];
    const tokens = tokenize(["--output", "dist"]);
    const { options, errors } = parseOptions(tokens, defs);
    expect(options).toEqual({ output: "dist" });
    expect(errors).toEqual([]);
  });

  test("parses string options with equals", () => {
    const defs: OptionDef[] = [
      { name: "output", short: "o", description: "Output", type: "string", required: false },
    ];
    const tokens = tokenize(["--output=dist"]);
    const { options, errors } = parseOptions(tokens, defs);
    expect(options).toEqual({ output: "dist" });
    expect(errors).toEqual([]);
  });

  test("parses number options", () => {
    const defs: OptionDef[] = [
      { name: "port", short: "p", description: "Port", type: "number", required: false },
    ];
    const tokens = tokenize(["--port", "3000"]);
    const { options, errors } = parseOptions(tokens, defs);
    expect(options).toEqual({ port: 3000 });
    expect(errors).toEqual([]);
  });

  test("applies default values", () => {
    const defs: OptionDef[] = [
      { name: "port", description: "Port", type: "number", required: false, default: 8080 },
    ];
    const tokens = tokenize([]);
    const { options, errors } = parseOptions(tokens, defs);
    expect(options).toEqual({ port: 8080 });
    expect(errors).toEqual([]);
  });

  test("reports missing required options", () => {
    const defs: OptionDef[] = [
      { name: "config", description: "Config", type: "string", required: true },
    ];
    const tokens = tokenize([]);
    const { errors } = parseOptions(tokens, defs);
    expect(errors.length).toBe(1);
    expect(errors[0]?.type).toBe("missing_required");
  });

  test("reports unknown options", () => {
    const defs: OptionDef[] = [];
    const tokens = tokenize(["--unknown"]);
    const { errors } = parseOptions(tokens, defs);
    expect(errors.length).toBe(1);
    expect(errors[0]?.type).toBe("unknown_option");
  });

  test("allows unknown options when configured", () => {
    const defs: OptionDef[] = [];
    const tokens = tokenize(["--unknown"]);
    const { errors } = parseOptions(tokens, defs, true);
    expect(errors).toEqual([]);
  });

  test("returns remaining tokens", () => {
    const defs: OptionDef[] = [
      { name: "verbose", short: "v", description: "Verbose", type: "boolean", required: false },
    ];
    const tokens = tokenize(["-v", "build", "src"]);
    const { remaining } = parseOptions(tokens, defs);
    expect(remaining.map((t) => t.value)).toEqual(["build", "src"]);
  });

  test("handles -- separator", () => {
    const defs: OptionDef[] = [
      { name: "verbose", short: "v", description: "Verbose", type: "boolean", required: false },
    ];
    const tokens = tokenize(["-v", "--", "--not-an-option"]);
    const { options, remaining } = parseOptions(tokens, defs);
    expect(options).toEqual({ verbose: true });
    expect(remaining.some((t) => t.value === "--not-an-option")).toBe(true);
  });
});
